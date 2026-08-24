import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.moduleName = "yaysapp"
    self.dependencyProvider = RCTAppDependencyProvider()

    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // `RCTLinkingManager` lives in the `React` module (React-Core's
  // `RCTLinkingHeaders` subspec) — the `React-RCTLinking` pod ships only
  // implementation files, so there is no module of that name to import.
  //
  // Both methods below are declared by `RCTAppDelegate`, so they need
  // `override` and forward to `super` when Linking does not claim the URL —
  // otherwise Google Sign-In's callback, which arrives the same way, is
  // swallowed.

  /// Hand `yaychat://…` links to React Native so the M6 deep-link registry can
  /// route them. Without this the scheme is registered but every link is
  /// dropped before JS ever sees it.
  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if RCTLinkingManager.application(app, open: url, options: options) {
      return true
    }
    return super.application(app, open: url, options: options)
  }

  /// The https twin of the same links, arriving as Universal Links.
  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    ) {
      return true
    }
    return super.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
