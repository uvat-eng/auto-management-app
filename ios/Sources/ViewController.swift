import UIKit
import WebKit
import SafariServices
import UniformTypeIdentifiers

/// Главный экран: «Автопарк», встроенный в приложение целиком.
final class ViewController: UIViewController {

    private var web: WKWebView!
    private let geo = GeoBridge()
    private var immersive = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        buildWebView()
        geo.send = { [weak self] js in
            DispatchQueue.main.async { self?.web.evaluateJavaScript(js, completionHandler: nil) }
        }
        web.load(URLRequest(url: AssetSchemeHandler.startURL))
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var prefersStatusBarHidden: Bool { immersive }
    override var prefersHomeIndicatorAutoHidden: Bool { immersive }

    private func buildWebView() {
        let cfg = WKWebViewConfiguration()
        cfg.setURLSchemeHandler(AssetSchemeHandler(), forURLScheme: AssetSchemeHandler.scheme)
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.websiteDataStore = .default()
        cfg.applicationNameForUserAgent = "AvtoparkApp/iOS"
        cfg.defaultWebpagePreferences.allowsContentJavaScript = true
        cfg.preferences.javaScriptCanOpenWindowsAutomatically = true

        let ucc = cfg.userContentController
        ucc.addUserScript(WKUserScript(source: Self.bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        ucc.add(WeakHandler(self), name: "native")
        ucc.add(WeakHandler(self), name: "geo")

        web = WKWebView(frame: .zero, configuration: cfg)
        web.translatesAutoresizingMaskIntoConstraints = false
        web.navigationDelegate = self
        web.uiDelegate = self
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        if #available(iOS 16.4, *) { web.isInspectable = true }

        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
    }

    private static var bridgeScript: String {
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        let site = Bundle.main.object(forInfoDictionaryKey: "AvtoparkSiteURL") as? String ?? ""
        return """
        (function () {
          var h = window.webkit && window.webkit.messageHandlers;
          if (!h) return;
          var post = function (name, body) { h[name].postMessage(body); };
          window.AvtoparkNative = {
            platform: "ios",
            keepAwake: function (on) { post("native", { action: "keepAwake", on: !!on }); },
            immersive: function (on) { post("native", { action: "immersive", on: !!on }); },
            versionCode: function () { return \(Int(build) ?? 1); },
            siteUrl: function () { return "\(site)"; },
            openUrl: function (u) { post("native", { action: "openUrl", url: String(u) }); },
            shareFile: function (n, b) { post("native", { action: "share", name: String(n), data: String(b) }); },
            saveFile: function (n, b) { post("native", { action: "save", name: String(n), data: String(b) }); return "ok"; }
          };
          var seq = 0, cbs = {};
          window.__avtoparkGeo = function (ids, pos, err) {
            ids.forEach(function (id) {
              var c = cbs[id];
              if (!c) return;
              if (pos && c.ok) c.ok(pos);
              else if (err && c.err) c.err(err);
              if (c.once) delete cbs[id];
            });
          };
          var geo = {
            getCurrentPosition: function (ok, err) { var id = ++seq; cbs[id] = { ok: ok, err: err, once: true }; post("geo", { action: "get", id: id }); },
            watchPosition: function (ok, err) { var id = ++seq; cbs[id] = { ok: ok, err: err }; post("geo", { action: "watch", id: id }); return id; },
            clearWatch: function (id) { delete cbs[id]; post("geo", { action: "clear", id: id }); }
          };
          try { Object.defineProperty(Navigator.prototype, "geolocation", { get: function () { return geo; }, configurable: true }); } catch (e) {}
          try { Object.defineProperty(navigator, "geolocation", { value: geo, configurable: true }); } catch (e) {}
        })();
        """
    }

    fileprivate func receive(_ m: WKScriptMessage) {
        guard let body = m.body as? [String: Any] else { return }
        if m.name == "geo" {
            geo.handle(body)
            return
        }
        switch body["action"] as? String {
        case "keepAwake":
            UIApplication.shared.isIdleTimerDisabled = (body["on"] as? Bool) ?? false
        case "immersive":
            immersive = (body["on"] as? Bool) ?? false
            setNeedsStatusBarAppearanceUpdate()
            setNeedsUpdateOfHomeIndicatorAutoHidden()
        case "openUrl":
            if let s = body["url"] as? String, let url = URL(string: s) { openExternal(url) }
        case "share":
            if let f = writeTemp(body) { share(f) }
        case "save":
            if let f = writeTemp(body) { export(f) }
        default:
            break
        }
    }

    private func writeTemp(_ body: [String: Any]) -> URL? {
        guard let raw = body["data"] as? String,
              let data = Data(base64Encoded: raw, options: .ignoreUnknownCharacters) else { return nil }
        let name = ((body["name"] as? String) ?? "avtopark.avtopark")
            .replacingOccurrences(of: "/", with: "_")
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("export", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let file = dir.appendingPathComponent(name.isEmpty ? "avtopark.avtopark" : name)
        try? FileManager.default.removeItem(at: file)
        do {
            try data.write(to: file)
            return file
        } catch {
            return nil
        }
    }

    private func share(_ file: URL) {
        let vc = UIActivityViewController(activityItems: [file], applicationActivities: nil)
        vc.popoverPresentationController?.sourceView = view
        vc.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        present(vc, animated: true)
    }

    private func export(_ file: URL) {
        let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
        present(picker, animated: true)
    }

    private func openExternal(_ url: URL) {
        if let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" {
            let safari = SFSafariViewController(url: url)
            safari.preferredControlTintColor = UIColor(red: 0.84, green: 0.67, blue: 0.33, alpha: 1)
            present(safari, animated: true)
        } else {
            UIApplication.shared.open(url)
        }
    }
}

/// Слабая ссылка, чтобы окно не держало само себя в памяти.
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    private weak var owner: ViewController?
    init(_ owner: ViewController) { self.owner = owner }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        owner?.receive(m)
    }
}

extension ViewController: WKNavigationDelegate {

    func webView(_ w: WKWebView,
                 decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url, let scheme = url.scheme?.lowercased() else {
            decisionHandler(.allow)
            return
        }
        if scheme == AssetSchemeHandler.scheme || scheme == "about" || scheme == "blob" || scheme == "data" {
            decisionHandler(.allow)
            return
        }
        if action.targetFrame?.isMainFrame == false {
            decisionHandler(.allow)
            return
        }
        decisionHandler(.cancel)
        openExternal(url)
    }

    func webViewWebContentProcessDidTerminate(_ w: WKWebView) {
        w.load(URLRequest(url: AssetSchemeHandler.startURL))
    }
}

extension ViewController: WKUIDelegate {

    func webView(_ w: WKWebView,
                 createWebViewWith cfg: WKWebViewConfiguration,
                 for action: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { openExternal(url) }
        return nil
    }

    func webView(_ w: WKWebView,
                 requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.prompt)
    }

    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage msg: String,
                 initiatedByFrame f: WKFrameInfo,
                 completionHandler done: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: msg, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "ОК", style: .default) { _ in done() })
        present(a, animated: true)
    }

    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage msg: String,
                 initiatedByFrame f: WKFrameInfo,
                 completionHandler done: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: msg, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Отмена", style: .cancel) { _ in done(false) })
        a.addAction(UIAlertAction(title: "ОК", style: .default) { _ in done(true) })
        present(a, animated: true)
    }

    func webView(_ w: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame f: WKFrameInfo,
                 completionHandler done: @escaping (String?) -> Void) {
        let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        a.addTextField { $0.text = defaultText }
        a.addAction(UIAlertAction(title: "Отмена", style: .cancel) { _ in done(nil) })
        a.addAction(UIAlertAction(title: "ОК", style: .default) { _ in done(a.textFields?.first?.text) })
        present(a, animated: true)
    }
}
