import { createContext, useContext, useEffect, useRef, type ReactNode } from "react"
import { Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native"

export const MotionPreference = createContext(true)
export const useMotionReduced = () => useContext(MotionPreference)

const native = Platform.OS !== "web"
const settle = Easing.out(Easing.cubic)
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function MotionIn({ children, style, distance = 8, duration = 220, animate = true }: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  distance?: number
  duration?: number
  animate?: boolean
}) {
  const enabled = !useMotionReduced() && animate
  const progress = useRef(new Animated.Value(enabled ? 0 : 1)).current
  useEffect(() => {
    if (!enabled) {
      progress.setValue(1)
      return
    }
    const animation = Animated.timing(progress, { toValue: 1, duration, easing: settle, useNativeDriver: native, isInteraction: false })
    animation.start()
    return () => animation.stop()
  }, [enabled, duration, progress])
  return <Animated.View style={[style, {
    opacity: enabled ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) : 1,
    transform: [{ translateY: enabled ? progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) : 0 }],
  }]}>{children}</Animated.View>
}

export function MotionPressable({ style, onPressIn, onPressOut, disabled, scale = 0.97, ...props }:
  Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; scale?: number }) {
  const reduced = useMotionReduced()
  const press = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (disabled || reduced) press.setValue(0)
    return () => press.stopAnimation()
  }, [disabled, reduced, press])

  function move(value: number) {
    if (reduced) {
      press.setValue(value)
      return
    }
    Animated.timing(press, { toValue: value, duration: value ? 85 : 145, easing: settle, useNativeDriver: native, isInteraction: false }).start()
  }

  return <AnimatedPressable {...props} disabled={disabled}
    onPressIn={event => { move(1); onPressIn?.(event) }}
    onPressOut={event => { move(0); onPressOut?.(event) }}
    style={[style, {
      opacity: disabled ? 0.5 : press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }),
      // Keep a valid transform when Fabric diffs enabled and disabled styles.
      transform: [{ scale: reduced || disabled ? 1 : press.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) }],
    }]} />
}
