import 'dart:js_interop';
import 'dart:ui_web' as ui_web;

import 'package:flutter/widgets.dart';
import 'package:web/web.dart' as web;

import 'engine_view_base.dart';

/// The editor runs in every browser Flutter Web supports.
bool get engineSupported => true;

/// Creates the engine host: an iframe with the bundled editor page.
EngineView createEngineView() => _IframeEngine();

/// Nothing to prepare on the web: the iframe loads when it's first shown.
void prewarmEngine() {}

int _nextViewId = 0;

class _IframeEngine extends EngineView {
  _IframeEngine() {
    _viewType = 'axiomtext-editor-${_nextViewId++}';
    _iframe = web.HTMLIFrameElement()
      ..src = ui_web.assetManager.getAssetUrl(engineAssetPath)
      ..title = 'AxiomText editor';
    _iframe.style
      ..border = '0'
      ..width = '100%'
      ..height = '100%'
      ..display = 'block';
    _iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    ui_web.platformViewRegistry
        .registerViewFactory(_viewType, (int viewId) => _iframe);

    _onMessage = ((web.Event event) {
      final message = event as web.MessageEvent;
      // Only the editor's own frame, on this site's origin, may talk to us (FLT-017).
      final source = message.source;
      if (source == null ||
          !source.strictEquals(_iframe.contentWindow).toDart) {
        return;
      }
      if (message.origin != web.window.location.origin) return;
      final data = message.data;
      if (data == null || !data.typeofEquals('string')) return;
      onMessage?.call((data as JSString).toDart);
    }).toJS;
    web.window.addEventListener('message', _onMessage);

    _onLoad = ((web.Event _) {
      if (_loaded) return;
      _loaded = true;
      final queued = List<String>.of(_queue);
      _queue.clear();
      queued.forEach(_post);
      onLoaded?.call();
    }).toJS;
    _iframe.addEventListener('load', _onLoad);
  }

  late final String _viewType;
  late final web.HTMLIFrameElement _iframe;
  late final JSFunction _onMessage;
  late final JSFunction _onLoad;
  bool _loaded = false;
  final List<String> _queue = [];

  @override
  bool get isLoaded => _loaded;

  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: _viewType);

  @override
  Future<void> send(String message) async {
    if (!_loaded) {
      _queue.add(message);
      return;
    }
    _post(message);
  }

  void _post(String message) {
    _iframe.contentWindow
        ?.postMessage(message.toJS, web.window.location.origin.toJS);
  }

  @override
  Future<void> setBackground(Color color) async {
    final argb = color.toARGB32();
    _iframe.style.background =
        'rgb(${(argb >> 16) & 0xff} ${(argb >> 8) & 0xff} ${argb & 0xff})';
  }

  @override
  void dispose() {
    onMessage = null;
    onLoaded = null;
    onExternalNavigation = null;
    web.window.removeEventListener('message', _onMessage);
    _iframe.removeEventListener('load', _onLoad);
  }
}
