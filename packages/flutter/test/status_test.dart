import 'package:axiomtext/axiomtext.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('exposes status and website', () {
    expect(axiomTextStatus, 'planned:M2');
    expect(axiomTextWebsite, startsWith('https://'));
  });
}
