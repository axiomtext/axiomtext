import 'package:flutter/widgets.dart';

/// Path of the bundled editor page, as a Flutter asset key.
const String engineAssetPath = 'packages/axiomtext/assets/editor/index.html';

/// Hosts the editor engine (a WebView or an iframe) and moves messages in and out.
///
/// Internal to the SDK: `AxiomTextEditor` creates one and `AxiomTextController` talks to it.
abstract class EngineView {
  /// Called with each raw JSON message from the engine.
  void Function(String message)? onMessage;

  /// Called once the editor page has loaded and can receive messages.
  void Function()? onLoaded;

  /// Called when the page tries to open another address (a link); it is never opened inside.
  void Function(Uri uri)? onExternalNavigation;

  /// Whether the page has finished loading.
  bool get isLoaded;

  /// The platform view to put in the widget tree.
  Widget build(BuildContext context);

  /// Sends one JSON message to the engine.
  Future<void> send(String message);

  /// Sets the colour shown behind the page while it loads (avoids a white flash).
  Future<void> setBackground(Color color);

  /// Releases the view.
  void dispose();
}
