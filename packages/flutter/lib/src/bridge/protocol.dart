// The message protocol between the Dart SDK and the editor engine running in the WebView.
//
// Must match packages/bridge-protocol/src/index.ts; a test there keeps the two lists equal.
import 'dart:convert';

/// Version of the message format. Messages with another version are ignored.
const int protocolVersion = 1;

/// Methods Dart may call in the engine.
const List<String> bridgeMethods = [
  'init',
  'getJson',
  'getHtml',
  'getMarkdown',
  'getText',
  'getStats',
  'setJson',
  'setHtml',
  'setMarkdown',
  'execute',
  'canExecute',
  'undo',
  'redo',
  'focus',
  'blur',
  'setEditable',
  'insertHtml',
  'insertText',
  'insertImage',
  'insertMath',
  'setTheme',
  'setLanguage',
  'translate',
  'resolveUpload',
  'mathInsert',
  'mathCommand',
  'mathCommit',
  'mathCancel',
  'mathToggleLatex',
  'getComments',
  'addComment',
  'replyToComment',
  'resolveComment',
  'deleteCommentThread',
  'setCommentStyle',
  'openCommentComposer',
  'toggleCommentsPanel',
  'getHighlights',
  'setHighlights',
];

/// Events the engine may send to Dart.
const List<String> bridgeEvents = [
  'ready',
  'change',
  'state',
  'focus',
  'blur',
  'height',
  'pickImage',
  'uploadImage',
  'linkTap',
  'mathEditStart',
  'mathEditChange',
  'mathEditEnd',
  'error',
  'commentsChange',
  'highlightsChange',
];

/// A call from Dart to the engine.
String encodeCall(int id, String method, [Map<String, Object?>? params]) {
  assert(bridgeMethods.contains(method), 'Unknown bridge method: $method');
  return jsonEncode({
    'v': protocolVersion,
    'kind': 'call',
    'id': id,
    'method': method,
    if (params != null) 'params': params,
  });
}

/// A message received from the engine.
sealed class EngineMessage {
  const EngineMessage();

  /// Parses and validates a raw message. Returns null for anything malformed or not allowed.
  static EngineMessage? parse(String raw) {
    if (raw.length > 50 * 1024 * 1024) return null;
    Object? decoded;
    try {
      decoded = jsonDecode(raw);
    } on FormatException {
      return null;
    }
    if (decoded is! Map<String, Object?>) return null;
    if (decoded['v'] != protocolVersion) return null;
    switch (decoded['kind']) {
      case 'result':
        final id = decoded['id'];
        final ok = decoded['ok'];
        if (id is! int || ok is! bool) return null;
        return EngineResult(
          id: id,
          ok: ok,
          value: decoded['value'],
          error:
              decoded['error'] is String ? decoded['error']! as String : null,
        );
      case 'event':
        final name = decoded['name'];
        if (name is! String || !bridgeEvents.contains(name)) return null;
        final data = decoded['data'];
        return EngineEvent(
          name: name,
          data: data is Map<String, Object?> ? data : const <String, Object?>{},
        );
      default:
        return null;
    }
  }
}

/// The engine's answer to a call.
final class EngineResult extends EngineMessage {
  /// Creates a result.
  const EngineResult(
      {required this.id, required this.ok, this.value, this.error});

  /// The id of the call this answers.
  final int id;

  /// Whether the call succeeded.
  final bool ok;

  /// The returned value, when [ok].
  final Object? value;

  /// The error message, when not [ok].
  final String? error;
}

/// Something that happened in the editor.
final class EngineEvent extends EngineMessage {
  /// Creates an event.
  const EngineEvent({required this.name, required this.data});

  /// The event's name (one of the allowed events).
  final String name;

  /// The event's data.
  final Map<String, Object?> data;
}
