module.exports = {
  expo: {
    name: "TLU Student Portal",
    slug: "tlu-student-portal",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "myapp",
    newArchEnabled: false,
    plugins: [
      "expo-dev-client",
      "expo-asset"
    ],
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tlu.studentportal",
      newArchEnabled: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.tlu.studentportal",
      newArchEnabled: false,
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        foregroundImage: "assets/icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {},
    extra: {
      eas: {
        projectId: "fc471311-b7e2-49c0-9223-5a79bb65667c"
      },
      // Microsoft SSO Config - đọc từ .env
      EXPO_PUBLIC_AZURE_AD_TENANT_ID: process.env.EXPO_PUBLIC_AZURE_AD_TENANT_ID || "67f466ec-d460-4f90-9465-f88465e460ef",
      EXPO_PUBLIC_AZURE_AD_CLIENT_ID: process.env.EXPO_PUBLIC_AZURE_AD_CLIENT_ID || "0f263b0c-86ad-46c8-a583-0381ec2c8be3",
      EXPO_PUBLIC_AZURE_AD_REDIRECT_URI: process.env.EXPO_PUBLIC_AZURE_AD_REDIRECT_URI || "https://cagent.cmcu.edu.vn/api/auth/mobile/azure-ad",
    }
  }
};
