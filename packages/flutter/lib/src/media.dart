import 'dart:convert';

import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'controller.dart';
import 'models.dart';

/// Uploads an image to your server, S3, Firebase… and returns its `https:` address.
///
/// Without one, images are embedded in the document (as base64), which needs no server.
typedef AxiomImageUploader = Future<String> Function(AxiomImageFile file);

/// How images are picked from the device (FLT-008).
@immutable
class AxiomImagePickerOptions {
  /// Creates picker options.
  const AxiomImagePickerOptions({
    this.camera = true,
    this.maxWidth = 2048,
    this.maxHeight = 2048,
    this.imageQuality = 85,
  });

  /// Offer "Take a photo" where the device has a camera.
  final bool camera;

  /// Larger photos are scaled down to this width (keeps documents small).
  final double? maxWidth;

  /// Larger photos are scaled down to this height.
  final double? maxHeight;

  /// JPEG quality, 0–100.
  final int? imageQuality;
}

/// Lets the user pick a photo (library or camera), uploads it if [upload] is given, and
/// inserts it into the editor at the cursor.
///
/// Returns true if an image was inserted.
Future<bool> pickAndInsertImage(
  BuildContext context,
  AxiomTextController controller, {
  AxiomImagePickerOptions options = const AxiomImagePickerOptions(),
  AxiomImageUploader? upload,
  bool cupertino = false,
  ImagePicker? picker,
}) async {
  final imagePicker = picker ?? ImagePicker();
  final cameraAvailable = options.camera &&
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS) &&
      imagePicker.supportsImageSource(ImageSource.camera);

  var source = ImageSource.gallery;
  if (cameraAvailable) {
    final chosen = await _chooseSource(context, controller, cupertino);
    if (chosen == null) return false;
    source = chosen;
  }

  final XFile? file;
  try {
    file = await imagePicker.pickImage(
      source: source,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      imageQuality: options.imageQuality,
    );
  } on Exception catch (error) {
    debugPrint('AxiomText: could not pick an image: $error');
    return false;
  }
  if (file == null) return false;

  final bytes = await file.readAsBytes();
  final image = AxiomImageFile(
    bytes: bytes,
    name: file.name,
    mimeType: file.mimeType ?? mimeTypeFor(file.name),
  );
  final src = await imageSource(image, upload);
  final inserted = await controller.insertImage(src);
  await controller.focus();
  return inserted;
}

/// The address to insert for [image]: the uploaded URL, or an embedded `data:` URL.
Future<String> imageSource(AxiomImageFile image, AxiomImageUploader? upload) async {
  if (upload != null) return upload(image);
  return 'data:${image.mimeType};base64,${base64Encode(image.bytes)}';
}

/// Guesses an image MIME type from a file name.
String mimeTypeFor(String name) {
  final lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
}

Future<ImageSource?> _chooseSource(
  BuildContext context,
  AxiomTextController controller,
  bool cupertino,
) {
  final library = controller.label('Choose a photo');
  final camera = controller.label('Take a photo');
  if (cupertino) {
    return showCupertinoModalPopup<ImageSource>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        actions: [
          CupertinoActionSheetAction(
            onPressed: () => Navigator.pop(context, ImageSource.gallery),
            child: Text(library),
          ),
          CupertinoActionSheetAction(
            onPressed: () => Navigator.pop(context, ImageSource.camera),
            child: Text(camera),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDefaultAction: true,
          onPressed: () => Navigator.pop(context),
          child: Text(controller.label('Cancel')),
        ),
      ),
    );
  }
  return showModalBottomSheet<ImageSource>(
    context: context,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: Text(library),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined),
            title: Text(camera),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
        ],
      ),
    ),
  );
}
