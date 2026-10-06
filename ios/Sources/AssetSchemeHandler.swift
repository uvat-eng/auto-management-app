import Foundation
import WebKit

/// Отдаёт встроенные в приложение файлы «Автопарка» по адресу avtopark://app/...
/// Сайт целиком лежит внутри приложения и работает без интернета.
final class AssetSchemeHandler: NSObject, WKURLSchemeHandler {

    static let scheme = "avtopark"
    static let host = "app"
    static var startURL: URL { URL(string: "\(scheme)://\(host)/")! }

    private let root: URL = Bundle.main.resourceURL!
        .appendingPathComponent("www", isDirectory: true)
        .standardizedFileURL

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            task.didFailWithError(URLError(.badURL))
            return
        }

        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }

        var file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        let inside = file.path.hasPrefix(root.path + "/")
        let exists = inside && FileManager.default.fileExists(atPath: file.path)
        if !exists && !(path as NSString).lastPathComponent.contains(".") {
            file = root.appendingPathComponent("index.html")
        }

        guard (inside || file.lastPathComponent == "index.html"),
              let data = try? Data(contentsOf: file) else {
            respond(task, url: url, status: 404, headers: ["Content-Type": "text/plain"], body: Data())
            return
        }

        var headers = [
            "Content-Type": Self.mime(file.pathExtension),
            "Access-Control-Allow-Origin": "*",
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache"
        ]

        if let range = task.request.value(forHTTPHeaderField: "Range"),
           let (start, end) = Self.parse(range: range, size: data.count) {
            let part = data.subdata(in: start..<(end + 1))
            headers["Content-Range"] = "bytes \(start)-\(end)/\(data.count)"
            headers["Content-Length"] = String(part.count)
            respond(task, url: url, status: 206, headers: headers, body: part)
            return
        }

        headers["Content-Length"] = String(data.count)
        respond(task, url: url, status: 200, headers: headers, body: data)
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, headers: [String: String], body: Data) {
        guard let r = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers) else {
            task.didFailWithError(URLError(.cannotParseResponse))
            return
        }
        task.didReceive(r)
        task.didReceive(body)
        task.didFinish()
    }

    private static func parse(range: String, size: Int) -> (Int, Int)? {
        guard size > 0, range.hasPrefix("bytes=") else { return nil }
        let spec = range.dropFirst(6).split(separator: ",").first.map(String.init) ?? ""
        let parts = spec.split(separator: "-", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 2 else { return nil }
        if parts[0].isEmpty, let suffix = Int(parts[1]), suffix > 0 {
            return (max(0, size - suffix), size - 1)
        }
        guard let start = Int(parts[0]), start < size else { return nil }
        let end = min(Int(parts[1]) ?? (size - 1), size - 1)
        return end >= start ? (start, end) : nil
    }

    static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "application/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json; charset=utf-8"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "svg": return "image/svg+xml"
        case "ico": return "image/x-icon"
        case "mp3": return "audio/mpeg"
        case "mp4": return "video/mp4"
        case "wasm": return "application/wasm"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        case "txt": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }
}
