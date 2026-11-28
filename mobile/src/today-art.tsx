import Svg, { Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg"
import type { Agent } from "./backend"

export function BotanicalEtching({ ink, grid }: { ink: string; grid: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 154 140" accessible={false}>
      <G stroke={grid} strokeWidth={0.65}>
        {[22, 43, 64, 85, 106, 127].map(x => <Line key={x} x1={x} y1={9} x2={x} y2={129} />)}
        {[25, 46, 67, 88, 109].map(y => <Line key={y} x1={7} y1={y} x2={144} y2={y} />)}
      </G>
      <G fill="none" stroke={ink} strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M115 132C92 115 83 91 76 64C73 52 69 45 61 39M92 107C102 84 112 69 127 55M82 89C59 89 44 97 27 110M102 120C113 107 121 91 123 77" />
        <Path d="M63 46C48 44 29 34 32 23C34 16 49 22 57 31C48 17 48 7 56 6C64 5 68 18 68 30C71 15 79 7 85 12C90 18 79 32 71 39C83 31 99 29 100 37C101 45 83 51 63 46Z" />
        <Path d="M65 45C52 35 45 30 35 27M66 44C59 25 57 15 57 10M68 44C74 28 80 20 84 15M70 45C82 42 91 37 97 37" />
        <Path d="M87 101C66 98 43 101 16 117C36 97 61 82 87 101ZM93 106C98 87 111 68 137 51C131 73 115 93 93 106ZM108 124C119 111 135 102 145 103C137 118 123 126 108 124ZM104 117C93 105 94 87 98 80C106 90 108 104 104 117Z" />
      </G>
    </Svg>
  )
}

export function CheckInOrbits({ ink }: { ink: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 170 155" accessible={false}>
      <G fill="none" stroke={ink} strokeWidth={0.9}>
        {[24, 42, 60, 78].map(angle => (
          <Ellipse key={angle} cx={85} cy={78} rx={68} ry={30} transform={`rotate(-${angle} 85 78)`} />
        ))}
      </G>
      <Path fill={ink} d="M85 60Q86 76 102 78Q86 79 85 96Q83 80 68 78Q83 77 85 60Z" />
    </Svg>
  )
}

export function AgentMonogram({ agent, ink }: { agent: Agent; ink: string }) {
  return (
    <Svg width="80%" height="80%" viewBox="0 0 80 70" accessible={false}>
      <G fill="none" stroke={ink} strokeWidth={1.35} strokeLinejoin="round">
        {agent === "nutrition" && [0, 45, 90, 135].map(angle =>
          <Ellipse key={angle} cx={40} cy={35} rx={31} ry={10} transform={`rotate(${angle} 40 35)`} />,
        )}
        {agent === "mental" && [-28, -42, -56].map((angle, index) =>
          <Ellipse key={angle} cx={40} cy={30 + index * 4} rx={32} ry={15} transform={`rotate(${angle} 40 35)`} />,
        )}
        {agent === "physical" && [0, 8, 16].map(offset =>
          <Polygon key={offset} points={`40,${8 + offset} ${70 - offset / 2},${61 - offset / 3} ${10 + offset / 2},${61 - offset / 3}`} />,
        )}
        {agent === "study" && [-28, -15, -2].map((angle, index) =>
          <Rect key={angle} x={17 + index * 4} y={13 + index * 4} width={43 - index * 5} height={43 - index * 5} transform={`rotate(${angle} 40 35)`} />,
        )}
      </G>
    </Svg>
  )
}
