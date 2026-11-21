// Picks the engine host for the platform: a WebView on Android, iOS and macOS, an iframe on
// the web. Platforms without either report `engineSupported == false`.
export 'engine_view_stub.dart'
    if (dart.library.js_interop) 'engine_view_web.dart'
    if (dart.library.io) 'engine_view_io.dart';
