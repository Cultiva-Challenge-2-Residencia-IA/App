import Svg, { Circle, Path } from "react-native-svg"
import { iconArtwork, type IconName } from "../../src/lib/iconArtwork"

export type { IconName }

export function Icon({ name, color, size = 22 }: {
  name: IconName
  color: string
  size?: number
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {iconArtwork[name].map((stroke, index) =>
        typeof stroke === "string"
          ? <Path key={index} d={stroke} />
          : <Circle key={index} cx={stroke[0]} cy={stroke[1]} r={stroke[2]} />,
      )}
    </Svg>
  )
}
