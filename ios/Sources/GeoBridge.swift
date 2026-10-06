import CoreLocation

/// Геопозиция для навигатора через системный модуль iOS.
/// Страница получает координаты так же, как в браузере, но разрешение
/// спрашивается один раз — от имени приложения.
final class GeoBridge: NSObject, CLLocationManagerDelegate {

    var send: ((String) -> Void)?

    private let manager = CLLocationManager()
    private var watches = Set<Int>()
    private var once = Set<Int>()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.activityType = .automotiveNavigation
        manager.distanceFilter = kCLDistanceFilterNone
    }

    func handle(_ body: [String: Any]) {
        guard let action = body["action"] as? String,
              let id = (body["id"] as? NSNumber)?.intValue else { return }

        switch action {
        case "watch":
            watches.insert(id)
            start()
        case "get":
            if let last = manager.location, -last.timestamp.timeIntervalSinceNow < 10 {
                deliver(last, to: [id])
            } else {
                once.insert(id)
                start()
            }
        case "clear":
            watches.remove(id)
            stopIfIdle()
        default:
            break
        }
    }

    private func start() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            fail(code: 1, message: "Доступ к геопозиции запрещён в настройках")
        default:
            manager.startUpdatingLocation()
        }
    }

    private func stopIfIdle() {
        if watches.isEmpty && once.isEmpty { manager.stopUpdatingLocation() }
    }

    func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        guard !watches.isEmpty || !once.isEmpty else { return }
        switch m.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            m.startUpdatingLocation()
        case .denied, .restricted:
            fail(code: 1, message: "Доступ к геопозиции запрещён в настройках")
        default:
            break
        }
    }

    func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let l = locations.last else { return }
        let ids = Array(watches) + Array(once)
        once.removeAll()
        deliver(l, to: ids)
        stopIfIdle()
    }

    func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        let code = (error as? CLError)?.code
        if code == .locationUnknown { return }
        fail(code: code == .denied ? 1 : 2, message: "Не удалось определить местоположение")
    }

    private func deliver(_ l: CLLocation, to ids: [Int]) {
        guard !ids.isEmpty else { return }
        let heading = l.course >= 0 ? "\(l.course)" : "null"
        let speed = l.speed >= 0 ? "\(l.speed)" : "null"
        let altitude = l.verticalAccuracy >= 0 ? "\(l.altitude)" : "null"
        let ts = Int(l.timestamp.timeIntervalSince1970 * 1000)
        let pos = "{coords:{latitude:\(l.coordinate.latitude),longitude:\(l.coordinate.longitude),"
            + "accuracy:\(l.horizontalAccuracy),altitude:\(altitude),altitudeAccuracy:null,"
            + "heading:\(heading),speed:\(speed)},timestamp:\(ts)}"
        send?("window.__avtoparkGeo && window.__avtoparkGeo(\(ids), \(pos), null)")
    }

    private func fail(code: Int, message: String) {
        let ids = Array(watches) + Array(once)
        once.removeAll()
        if code == 1 {
            watches.removeAll()
            manager.stopUpdatingLocation()
        }
        guard !ids.isEmpty else { return }
        let err = "{code:\(code),message:\"\(message)\",PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3}"
        send?("window.__avtoparkGeo && window.__avtoparkGeo(\(ids), null, \(err))")
    }
}
