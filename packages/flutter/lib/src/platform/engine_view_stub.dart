import 'engine_view_base.dart';

/// Whether this platform can show the editor.
bool get engineSupported => false;

/// Creates the engine host for this platform.
EngineView createEngineView() =>
    throw UnsupportedError('AxiomText needs Android, iOS, macOS or the web.');

/// Starts loading an engine ahead of time so the first editor opens faster.
void prewarmEngine() {}
