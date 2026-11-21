import 'dart:convert';

import 'package:axiomtext/src/bridge/protocol.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('encodes calls with version, id and method', () {
    final json =
        jsonDecode(encodeCall(4, 'execute', {'command': 'toggleBold'}));
    expect(json, {
      'v': 1,
      'kind': 'call',
      'id': 4,
      'method': 'execute',
      'params': {'command': 'toggleBold'},
    });
  });

  test('parses results and allowed events', () {
    final result = EngineMessage.parse(
        '{"v":1,"kind":"result","id":2,"ok":true,"value":"x"}');
    expect(result, isA<EngineResult>().having((r) => r.value, 'value', 'x'));
    final event = EngineMessage.parse(
        '{"v":1,"kind":"event","name":"change","data":{"words":3}}');
    expect(
        event, isA<EngineEvent>().having((e) => e.data['words'], 'words', 3));
  });

  test('drops anything malformed or not on the allowlist', () {
    for (final raw in [
      'nope',
      '[]',
      '{"v":2,"kind":"event","name":"change"}',
      '{"v":1,"kind":"event","name":"runThis"}',
      '{"v":1,"kind":"result","id":"1","ok":true}',
      '{"v":1,"kind":"call","id":1,"method":"getJson"}',
    ]) {
      expect(EngineMessage.parse(raw), isNull, reason: raw);
    }
  });
}
