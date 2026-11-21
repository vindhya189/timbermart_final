
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

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
  State<TimberMartHome> createState() => _TimberMartHomeState();
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

    // Native Android share bridge
    await controller.addJavaScriptChannel(
      'NativeShare',
      onMessageReceived: (message) {
        handleNativeShare(message.message);
      },
    );

    await controller.setNavigationDelegate(
      NavigationDelegate(
        onNavigationRequest: (request) {
          final uri = Uri.tryParse(request.url);

          if (uri != null && isWhatsAppUrl(uri)) {
            openExternalApp(uri);
            return NavigationDecision.prevent;
          }

          return NavigationDecision.navigate;
        },
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

          injectShareBridge();
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

    // Android WebView permissions and file upload
    if (Platform.isAndroid &&
        controller.platform is AndroidWebViewController) {
      final androidController =
          controller.platform as AndroidWebViewController;

      await androidController.setGeolocationEnabled(true);

      await androidController
          .setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (request) async {
          try {
            final uri = Uri.tryParse(request.origin);

            final trustedOrigin = uri != null &&
                uri.scheme == 'https' &&
                (uri.host == 'timbermart.co.in' ||
                    uri.host.endsWith('.timbermart.co.in'));

            if (!trustedOrigin) {
              return const GeolocationPermissionsResponse(
                allow: false,
                retain: false,
              );
            }

            var permission =
                await Permission.locationWhenInUse.status;

            if (!permission.isGranted) {
              permission =
                  await Permission.locationWhenInUse.request();
            }

            final allowed = permission.isGranted;

            debugPrint(
              'Location permission granted: $allowed',
            );

            return GeolocationPermissionsResponse(
              allow: allowed,
              retain: allowed,
            );
          } catch (e) {
            debugPrint('LOCATION ERROR: $e');

            return const GeolocationPermissionsResponse(
              allow: false,
              retain: false,
            );
          }
        },
      );

      // Existing gallery and camera support
      await androidController.setOnShowFileSelector(
        handleFileSelection,
      );

      debugPrint('LOCATION AND FILE PICKER REGISTERED');
    }

    await controller.loadRequest(
      Uri.parse('https://timbermart.co.in'),
    );
  }

  // Identify WhatsApp links
  bool isWhatsAppUrl(Uri uri) {
    final host = uri.host.toLowerCase();
    final scheme = uri.scheme.toLowerCase();

    return scheme == 'whatsapp' ||
        scheme == 'intent' ||
        host == 'wa.me' ||
        host == 'api.whatsapp.com' ||
        host == 'web.whatsapp.com' ||
        host == 'whatsapp.com' ||
        host.endsWith('.whatsapp.com');
  }

  // Open WhatsApp or another external app
  Future<void> openExternalApp(Uri uri) async {
    try {
      final opened = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );

      debugPrint('External app opened: $opened');

      if (!opened) {
        debugPrint('Could not open external URL: $uri');
      }
    } catch (e) {
      debugPrint('EXTERNAL APP ERROR: $e');
    }
  }

  // Receive website share requests
  Future<void> handleNativeShare(String message) async {
    try {
      final Map<String, dynamic> data =
          jsonDecode(message) as Map<String, dynamic>;

      final title = data['title']?.toString() ?? '';
      final text = data['text']?.toString() ?? '';
      final url = data['url']?.toString() ?? '';

      final content = [
        text,
        url,
      ].where((value) => value.trim().isNotEmpty).join('\n');

      if (content.isEmpty) {
        debugPrint('Nothing to share');
        return;
      }

      await SharePlus.instance.share(
        ShareParams(
          title: title.isEmpty ? 'Share TimberMart' : title,
          text: content,
        ),
      );

      debugPrint('Native sharing completed');
    } catch (e) {
      debugPrint('NATIVE SHARE ERROR: $e');
    }
  }

  // Connect website navigator.share() to Android share menu
  Future<void> injectShareBridge() async {
    const script = r'''
      (function () {
        if (window.__timberMartShareInstalled) return;
        window.__timberMartShareInstalled = true;

        try {
          Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async function(data) {
              if (window.NativeShare) {
                window.NativeShare.postMessage(
                  JSON.stringify({
                    title: data.title || 'TimberMart',
                    text: data.text || '',
                    url: data.url || window.location.href
                  })
                );
                return Promise.resolve();
              }

              throw new Error('Native sharing is unavailable');
            }
          });

          if (!navigator.canShare) {
            Object.defineProperty(navigator, 'canShare', {
              configurable: true,
              value: function() {
                return true;
              }
            });
          }
        } catch (e) {
          console.log('TimberMart share bridge:', e);
        }
      })();
    ''';

    try {
      await controller.runJavaScript(script);
      debugPrint('NATIVE SHARE BRIDGE INSTALLED');
    } catch (e) {
      debugPrint('SHARE BRIDGE ERROR: $e');
    }
  }

  // Camera and Gallery selection
  Future<List<String>> handleFileSelection(
    FileSelectorParams params,
  ) async {
    try {
      debugPrint('FILE PICKER CALLBACK TRIGGERED');

      final bool allowMultiple =
          params.mode == FileSelectorMode.openMultiple;

      final bool wantsImage =
          params.acceptTypes.isEmpty ||
          params.acceptTypes.any(
            (type) => type.toLowerCase().contains('image'),
          );

      // CAMERA
      if (params.isCaptureEnabled &&
          wantsImage &&
          !allowMultiple) {
        final XFile? photo = await ImagePicker().pickImage(
          source: ImageSource.camera,
          imageQuality: 85,
        );

        if (photo == null) return [];

        return [File(photo.path).uri.toString()];
      }

      // GALLERY - MULTIPLE PHOTOS
      if (allowMultiple) {
        final result = await FilePicker.pickFiles(
          type: wantsImage ? FileType.image : FileType.any,
        );

        return result
            .where((file) => file.path != null)
            .map((file) => File(file.path!).uri.toString())
            .toList();
      }

      // GALLERY - SINGLE FILE
      final file = await FilePicker.pickFile(
        type: wantsImage ? FileType.image : FileType.any,
      );

      if (file == null || file.path == null) {
        return [];
      }

      return [File(file.path!).uri.toString()];
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
