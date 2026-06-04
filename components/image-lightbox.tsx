import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';

type LightboxImage = {
  id: string;
  uri: string;
  label?: string | null;
};

export function ImageLightbox({
  images,
  thumbnailSize = 72,
}: {
  images: LightboxImage[];
  thumbnailSize?: number;
}) {
  const [selectedImage, setSelectedImage] = useState<LightboxImage | null>(null);

  if (images.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.row}>
        {images.map((image) => (
          <Pressable key={image.id} onPress={() => setSelectedImage(image)} style={styles.thumbWrap}>
            <Image
              source={{ uri: image.uri }}
              style={[
                styles.thumb,
                {
                  height: thumbnailSize,
                  width: thumbnailSize,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
        transparent
        visible={Boolean(selectedImage)}>
        <Pressable onPress={() => setSelectedImage(null)} style={styles.backdrop}>
          <View style={styles.modalCard}>
            {selectedImage ? (
              <>
                <Image resizeMode="contain" source={{ uri: selectedImage.uri }} style={styles.fullImage} />
                {selectedImage.label ? <Text style={styles.caption}>{selectedImage.label}</Text> : null}
                <Text style={styles.closeHint}>Tap anywhere to close</Text>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  thumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    borderRadius: 12,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    alignItems: 'center',
    width: '100%',
  },
  fullImage: {
    borderRadius: 18,
    height: 420,
    maxWidth: 760,
    width: '100%',
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  closeHint: {
    color: palette.border,
    fontSize: 12,
    marginTop: 8,
  },
});
