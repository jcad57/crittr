import { Colors } from "@/constants/colors";
import { AVATAR_SIZE } from "@/constants/petInfo";
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
          <MaterialCommunityIcons
            name="paw"
            size={40}
            color={Colors.gray300}
          />
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
    fontFamily: "InstrumentSans-Bold",
    fontSize: 14,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 8,
    overflow: "hidden",
  },
});
