import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Alert, Share } from 'react-native';

export async function capturePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Camera access needed',
      'Enable camera access in Settings to attach a photo.'
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.7,
    allowsEditing: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

export async function pickPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Photo library access needed',
      'Enable photo access in Settings to attach a document.'
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 0.7,
    allowsEditing: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

export async function sharePhoto(uri: string, dialogTitle: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, { dialogTitle });
    return;
  }
  await Share.share({ url: uri, message: dialogTitle });
}
