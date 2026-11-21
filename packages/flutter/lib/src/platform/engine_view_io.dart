import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'engine_view_base.dart';

/// Whether this platform can show the editor (webview_flutter: Android, iOS, macOS).
bool get engineSupported => Platform.isAndroid || Platform.isIOS || Platform.isMacOS;

_WebViewEngine? _warm;

/// Creates the engine host: a WebView with the bundled editor page.
EngineView createEngineView() {
  final warm = _warm;
  _warm = null;
  return warm ?? _WebViewEngine();
}

/// Starts loading an engine ahead of time so the first editor opens faster (FLT-016).
void prewarmEngine() {
  if (!engineSupported || _warm != null) return;
  _warm = _WebViewEngine();
}

class _WebViewEngine extends EngineView {
  _WebViewEngine() {
    controller = WebViewController();
    unawaited(_setUp());
  }

  late final WebViewController controller;
  bool _loaded = false;
  final List<String> _queue = [];

  @override
  bool get isLoaded => _loaded;

  Future<void> _setUp() async {
    await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await controller.addJavaScriptChannel(
      'AxiomBridge',
      onMessageReceived: (JavaScriptMessage message) => onMessage?.call(message.message),
    );
    await controller.setNavigationDelegate(
      NavigationDelegate(
        onNavigationRequest: (NavigationRequest request) {
          // Only the bundled editor page may load in the view (FLT-017).
          if (_isEnginePage(request.url)) return NavigationDecision.navigate;
          final uri = Uri.tryParse(request.url);
          if (uri != null) onExternalNavigation?.call(uri);
          return NavigationDecision.prevent;
        },
        onPageFinished: (String url) {
          if (!_isEnginePage(url) || _loaded) return;
          _loaded = true;
          final queued = List<String>.of(_queue);
          _queue.clear();
          for (final message in queued) {
            unawaited(_run(message));
          }
          onLoaded?.call();
        },
      ),
    );
    await controller.loadFlutterAsset(engineAssetPath);
  }

  static bool _isEnginePage(String url) =>
      url == 'about:blank' ||
      ((url.startsWith('file:') || url.startsWith('http://localhost')) &&
          url.contains('/assets/editor/index.html'));

  @override
  Widget build(BuildContext context) => WebViewWidget(
        controller: controller,
        // The editor handles its own taps, drags and scrolling.
        gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
          Factory<OneSequenceGestureRecognizer>(EagerGestureRecognizer.new),
        },
      );

  @override
  Future<void> send(String message) async {
    if (!_loaded) {
      _queue.add(message);
      return;
    }
    await _run(message);
  }

  // The message is passed as a JSON string literal to one fixed function; nothing from Dart is
  // ever evaluated as code (FLT-017).
  Future<void> _run(String message) =>
      controller.runJavaScript('window.axiomReceive && window.axiomReceive(${jsonEncode(message)})');

  @override
  Future<void> setBackground(Color color) async {
    try {
      await controller.setBackgroundColor(color);
    } on UnimplementedError {
      // macOS WebViews can't change their background colour; the page paints it instead.
    } on UnsupportedError {
      // Same as above on some platform versions.
    }
  }

  @override
  void dispose() {
    onMessage = null;
    onLoaded = null;
    onExternalNavigation = null;
    unawaited(controller.loadRequest(Uri.parse('about:blank')).catchError((Object _) {}));
  }
}
