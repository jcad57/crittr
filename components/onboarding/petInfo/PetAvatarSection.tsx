import { Colors } from "@/constants/colors";
import { AVATAR_SIZE } from "@/constants/petInfo";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type PetAvatarSectionProps = {
  avatarUri: string | null;
  onPickImage: () => void;
};

export default function PetAvatarSection({
  avatarUri,
  onPickImage,
}: PetAvatarSectionProps) {
  return (
    <View style={styles.avatarSection}>
      <TouchableOpacity style={styles.avatarCircle} onPress={onPickImage}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <MaterialCommunityIcons name="paw" size={40} color={Colors.gray300} />
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={onPickImage}>
        <Text style={styles.uploadLabel}>Upload Photo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.gray100,
    borderWidth: 2,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  uploadLabel: {
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.orange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.orange,
    borderRadius: 999,
    overflow: "hidden",
  },
});
