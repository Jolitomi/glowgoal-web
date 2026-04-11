import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type BuddyPopupProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export default function BuddyPopup({
  visible,
  title,
  message,
  onClose,
}: BuddyPopupProps) {
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -30,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.popupWrap,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFF7E8', '#FDE7BE']}
          style={styles.popupCard}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Okay</Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 18,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  popupWrap: {
    width: '100%',
  },
  popupCard: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#3B3128',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5C4B3F',
    fontWeight: '600',
  },
  button: {
    alignSelf: 'flex-end',
    marginTop: 14,
    backgroundColor: '#3B3128',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});