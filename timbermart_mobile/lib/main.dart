
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TimberMartApp());
}

class TimberMartApp extends StatelessWidget {
  const TimberMartApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'TimberMart',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF174D35),
        ),
        useMaterial3: true,
      ),
      home: const TimberMartHome(),
    );
  }
}

class TimberMartHome extends StatefulWidget {
  const TimberMartHome({super.key});

  @override
  State<TimberMartHome> createState() =>
      _TimberMartHomeState();
}

class _TimberMartHomeState extends State<TimberMartHome> {
  late final WebViewController controller;

  bool isLoading = true;
  bool hasError = false;

  @override
  void initState() {
    super.initState();
    controller = WebViewController();
    initializeWebView();
  }

  Future<void> initializeWebView() async {
    await controller.setJavaScriptMode(
      JavaScriptMode.unrestricted,
    );

    await controller.setNavigationDelegate(
      NavigationDelegate(
        onPageStarted: (url) {
          if (!mounted) return;
          setState(() {
            isLoading = true;
            hasError = false;
          });
        },
        onPageFinished: (url) {
          if (!mounted) return;
          setState(() {
            isLoading = false;
          });
        },
        onWebResourceError: (error) {
          if (error.isForMainFrame == true && mounted) {
            setState(() {
              isLoading = false;
              hasError = true;
            });
          }
        },
      ),
    );

    // Android WebView file upload support
    if (Platform.isAndroid &&
        controller.platform is AndroidWebViewController) {
      final androidController =
          controller.platform as AndroidWebViewController;

      await androidController.setOnShowFileSelector(
         handleFileSelection,
      );

      debugPrint('ANDROID FILE SELECTOR REGISTERED');
    }

    

    await controller.loadRequest(
      Uri.parse('https://timbermart.co.in'),
    );
  }

  // Convert selected file paths into URIs
  String normalizeFileUri(String path) {
    if (path.startsWith('content:') ||
        path.startsWith('file:')) {
      return path;
    }

    return Uri.file(path).toString();
  }

  // Camera and Gallery selection
  
Future<List<String>> handleFileSelection(
  FileSelectorParams params,
) async {
  try {
    debugPrint('FILE PICKER CALLBACK TRIGGERED');
    debugPrint('Accept types: ${params.acceptTypes}');
    debugPrint('Mode: ${params.mode}');
    debugPrint('Capture enabled: ${params.isCaptureEnabled}');

    final bool allowMultiple =
        params.mode == FileSelectorMode.openMultiple;

    final bool wantsImage =
        params.acceptTypes.isEmpty ||
        params.acceptTypes.any(
          (type) => type.toLowerCase().contains('image'),
        );

    // CAMERA
    if (params.isCaptureEnabled && wantsImage && !allowMultiple) {
      final XFile? photo = await ImagePicker().pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );

      if (photo == null) return [];

      final uri = File(photo.path).uri.toString();
      debugPrint('Camera URI: $uri');

      return [uri];
    }

    // GALLERY - MULTIPLE PHOTOS
    if (allowMultiple) {
      final List<PlatformFile> files =
          await FilePicker.pickFiles(
        type: wantsImage ? FileType.image : FileType.any,
      );

      final List<String> uris = files
          .where((file) => file.path != null)
          .map((file) => File(file.path!).uri.toString())
          .toList();

      debugPrint('Selected files: ${uris.length}');
      debugPrint('Selected URIs: $uris');

      return uris;
    }

    // GALLERY - SINGLE FILE
    final PlatformFile? file = await FilePicker.pickFile(
      type: wantsImage ? FileType.image : FileType.any,
    );

    if (file == null || file.path == null) {
      debugPrint('No file selected');
      return [];
    }

    final uri = File(file.path!).uri.toString();
    debugPrint('Selected URI: $uri');

    return [uri];
  } catch (e, stack) {
    debugPrint('FILE PICKER ERROR: $e');
    debugPrintStack(stackTrace: stack);
    return [];
  }
}


  Future<void> handleBack() async {
    if (await controller.canGoBack()) {
      await controller.goBack();
    } else {
      await SystemNavigator.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop) {
          await handleBack();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: controller),

              if (isLoading)
                const Center(
                  child: CircularProgressIndicator(
                    color: Color(0xFF174D35),
                  ),
                ),

              if (hasError)
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.wifi_off,
                        size: 55,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Unable to load TimberMart',
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () {
                          controller.reload();
                        },
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
