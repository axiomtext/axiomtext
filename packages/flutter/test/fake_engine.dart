import 'dart:async';
import 'dart:convert';

import 'package:axiomtext/src/platform/engine_view_base.dart';
import 'package:flutter/widgets.dart';

/// Stands in for the WebView: records calls and answers like the real engine.
class FakeEngine extends EngineView {
  FakeEngine({Map<String, Object? Function(Map<String, Object?> params)>? handlers})
      : handlers = {
          'init': (_) => {
                'version': 1,
                'commands': ['toggleBold', 'toggleItalic', 'setHeading', 'insertTable'],
                'language': 'en',
                'dir': 'ltr',
                'fontFamilies': [
                  {'label': 'Default font', 'value': null},
                  {'label': 'Georgia', 'value': 'Georgia, serif'},
                ],
                'fontSizes': [null, '16px', '24px'],
                'textColors': [
                  {'name': 'Red', 'value': '#dc2626'},
                ],
                'highlightColors': [
                  {'name': 'Yellow', 'value': '#fef08a'},
                ],
              },
          'translate': (params) => {
                for (final text in (params['texts']! as List<Object?>).cast<String>()) text: text,
              },
          ...?handlers,
        };

  final Map<String, Object? Function(Map<String, Object?> params)> handlers;

  /// Every call received, as decoded JSON.
  final List<Map<String, Object?>> calls = [];

  /// Calls received, by method name.
  List<String> get methods => [for (final c in calls) c['method']! as String];

  @override
  bool get isLoaded => true;

  @override
  Widget build(BuildContext context) => const SizedBox.expand();

  @override
  Future<void> send(String message) async {
    final call = jsonDecode(message) as Map<String, Object?>;
    calls.add(call);
    final method = call['method']! as String;
    final id = call['id']! as int;
    final params = (call['params'] as Map<String, Object?>?) ?? const <String, Object?>{};
    final handler = handlers[method];
    // Answer asynchronously, like a real WebView.
    scheduleMicrotask(() {
      if (handler == null) {
        reply({'v': 1, 'kind': 'result', 'id': id, 'ok': true});
        return;
      }
      try {
        reply({'v': 1, 'kind': 'result', 'id': id, 'ok': true, 'value': handler(params)});
      } on Exception catch (error) {
        reply({'v': 1, 'kind': 'result', 'id': id, 'ok': false, 'error': '$error'});
      }
    });
  }

  /// Sends a raw message as if it came from the engine.
  void reply(Map<String, Object?> message) => onMessage?.call(jsonEncode(message));

  /// Sends an event as if it came from the engine.
  void emit(String name, [Map<String, Object?>? data]) =>
      reply({'v': 1, 'kind': 'event', 'name': name, if (data != null) 'data': data});

  @override
  Future<void> setBackground(Color color) async {}

  @override
  void dispose() {}
}
