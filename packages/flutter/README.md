# AxiomText for Flutter

Free, open-source (MIT) rich text editor with a built-in **math equation editor** for Flutter —
Android, iOS, Web, macOS, Windows and Linux.

> 🚧 **Placeholder release.** This version reserves the package name. The `AxiomTextEditor` widget
> arrives in milestone M2. Follow progress at [axiomtext.dev](https://axiomtext.dev).

## Planned API

```dart
final controller = AxiomTextController();

AxiomTextEditor(
  controller: controller,
  placeholder: 'Start writing…',
);

final json = await controller.getJson();
await controller.execute('toggleBold');
```

## License

MIT — see [LICENSE](LICENSE).
