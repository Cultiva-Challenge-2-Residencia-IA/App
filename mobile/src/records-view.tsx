import { useState } from "react"
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import Svg, { Path } from "react-native-svg"
import { Icon, type IconName } from "./icons"
import { tones, usePalette } from "./ui"

export function RecordsHeader({ openMenu }: { openMenu: () => void }) {
  const color = usePalette()
  return (
    <View style={[styles.header, { borderBottomColor: color.line }]}>
      <View style={styles.headerTop}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: color.lime }]}>
            <Icon name="leaf" color={tones.onAction} size={18} />
          </View>
          <Text style={[styles.wordmark, { color: color.ink }]}>Cultiva</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Mais ações de Registros"
          onPress={openMenu} style={({ pressed }) => [
            styles.menuButton, { backgroundColor: pressed ? color.line : color.surface },
          ]}>
          <Icon name="settings" color={color.ink} size={22} />
        </Pressable>
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.arcs}>
        <Svg width={124} height={68} viewBox="0 0 124 68" accessible={false}>
          <Path d="M1 68A124 124 0 0 1 124 1M24 68A100 100 0 0 1 124 15M46 68A78 78 0 0 1 124 30M68 68A56 56 0 0 1 124 47"
            stroke={color.lime} strokeWidth={1.5} fill="none" />
        </Svg>
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: color.ink }]}>Registros</Text>
      <Text style={[styles.caption, { color: color.muted }]}>Acompanhe sua evolução</Text>
    </View>
  )
}

type FilterOption = { label: string; selected: boolean; choose: () => void }

export function RecordsFilters({ period, category, periods, categories, onPeriod, onCategory }: {
  period: number
  category: string
  periods: readonly number[]
  categories: readonly string[]
  onPeriod: (days: number) => void
  onCategory: (value: string) => void
}) {
  const color = usePalette()
  const [open, setOpen] = useState<"period" | "category">()
  const options: FilterOption[] = open === "period"
    ? periods.map(days => ({ label: `Últimos ${days} dias`, selected: period === days, choose: () => onPeriod(days) }))
    : categories.map(value => ({ label: value, selected: category === value, choose: () => onCategory(value) }))
  return (
    <View style={styles.filters}>
      <View style={styles.filterRow}>
        {([
          { id: "period", icon: "calendar", label: `Últimos ${period} dias`, title: "Período" },
          { id: "category", icon: "filter", label: category, title: "Categoria" },
        ] as const).filter(filter => filter.id === "period" || categories.length > 1).map(filter => {
          const primary = filter.id === "period"
          const ink = primary ? tones.onCanvas : color.ink
          const expanded = open === filter.id
          return (
            <Pressable key={filter.id} accessibilityRole="button" accessibilityLabel={filter.title + ": " + filter.label}
              accessibilityState={{ expanded }} onPress={() => setOpen(expanded ? undefined : filter.id)}
              style={({ pressed }) => [
                styles.selector,
                { backgroundColor: primary ? color.hero : color.surface, borderColor: primary ? color.hero : color.line, opacity: pressed ? 0.73 : 1 },
              ]}>
              <Icon name={filter.icon} size={17} color={primary ? color.lime : ink} />
              <Text style={[styles.selectorText, { color: ink }]}>{filter.label}</Text>
              <View style={{ transform: [{ rotate: expanded ? "-90deg" : "90deg" }] }}>
                <Icon name="arrow" size={16} color={ink} />
              </View>
            </Pressable>
          )
        })}
      </View>
      {open && (
        <View style={[styles.options, { backgroundColor: color.surface, borderColor: color.line }]}>
          {options.map(option => (
            <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: option.selected }}
              onPress={() => { option.choose(); setOpen(undefined) }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: option.selected ? color.lime : pressed ? color.paper : color.surface, borderBottomColor: color.line },
              ]}>
              <Text style={[styles.optionText, { color: option.selected ? tones.onAction : color.ink }]}>{option.label}</Text>
              {option.selected && <Icon name="check" size={17} color={tones.onAction} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

export function RecordsSummary({ total, stats }: {
  total: number
  stats: { icon: IconName; label: string }[]
}) {
  const color = usePalette()
  const { width, fontScale } = useWindowDimensions()
  const split = width >= 340 && fontScale <= 1.25
  return (
    <View style={[styles.summary, split && styles.summarySplit, { backgroundColor: color.hero }]}>
      <View style={styles.total}>
        <Text style={styles.number}>{total}</Text>
        <Text style={styles.summaryTitle}>{total === 1 ? "registro" : "registros"}</Text>
        <Text style={styles.summaryCaption}>no período</Text>
      </View>
      <View style={[styles.metrics, split ? styles.metricVertical : styles.metricHorizontal, { borderColor: color.lime + "70" }]}>
        {stats.map(stat => (
          <View key={stat.icon} style={styles.metric}>
            <Icon name={stat.icon} size={21} color={color.lime} />
            <Text style={styles.metricText}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export type TimelineEntry = {
  id: string
  title: string
  category: string
  time: string
  preview: string
  icon: IconName
  details: { label: string; value: string }[]
}

export function RecordsTimeline({ groups }: { groups: { day: string; title: string; entries: TimelineEntry[] }[] }) {
  const color = usePalette()
  const [expanded, setExpanded] = useState<string>()
  return (
    <View style={styles.timeline}>
      {groups.map(group => (
        <View key={group.day} style={styles.group}>
          <Text accessibilityRole="header" style={[styles.day, { color: color.muted }]}>{group.title}</Text>
          <View style={[styles.track, { borderLeftColor: color.line }]}>
            {group.entries.map(entry => {
              const open = expanded === entry.id
              return (
                <View key={entry.id} style={[styles.entry, { borderColor: color.line, backgroundColor: color.surface }]}>
                  <View style={[styles.marker, { borderColor: color.muted, backgroundColor: color.paper }]} />
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? undefined : entry.id)}
                    style={({ pressed }) => [styles.entryButton, { opacity: pressed ? 0.68 : 1 }]}>
                    <View style={[styles.entryIcon, { backgroundColor: color.lime }]}>
                      <Icon name={entry.icon} color={tones.onAction} size={19} />
                    </View>
                    <View style={styles.entryCopy}>
                      <Text style={[styles.entryTitle, { color: color.ink }]}>{entry.title}</Text>
                      <Text style={[styles.entryMeta, { color: color.muted }]}>{entry.time}  /  {entry.category}</Text>
                      {!!entry.preview && <Text numberOfLines={2} style={[styles.preview, { color: color.ink }]}>{entry.preview}</Text>}
                    </View>
                    <View style={{ transform: [{ rotate: open ? "-90deg" : "90deg" }] }}>
                      <Icon name="arrow" color={color.muted} size={18} />
                    </View>
                  </Pressable>
                  {open && (
                    <View style={[styles.details, { borderTopColor: color.line }]}>
                      {entry.details.length ? entry.details.map(detail => (
                        <View key={detail.label} style={styles.detail}>
                          <Text style={[styles.detailLabel, { color: color.muted }]}>{detail.label}</Text>
                          <Text selectable style={[styles.detailValue, { color: color.ink }]}>{detail.value}</Text>
                        </View>
                      )) : <Text style={[styles.preview, { color: color.muted }]}>Sem informações adicionais neste registro.</Text>}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { gap: 5, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 31, height: 31, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-9deg" }] },
  wordmark: { fontSize: 18, fontWeight: "800" },
  menuButton: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 48, fontWeight: "900", letterSpacing: -2.6 },
  caption: { fontSize: 14, fontWeight: "500" },
  arcs: { position: "absolute", right: -20, bottom: 0, opacity: 0.75 },
  filters: { gap: 6 },
  filterRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  selector: { flex: 1, minWidth: 0, minHeight: 46, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  selectorText: { flex: 1, fontSize: 13, fontWeight: "800" },
  options: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  option: { minHeight: 43, paddingHorizontal: 11, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionText: { fontSize: 14, fontWeight: "600" },
  summary: { borderRadius: 16, padding: 13, gap: 12 },
  summarySplit: { flexDirection: "row", alignItems: "center" },
  total: { minWidth: 109, gap: 0 },
  number: { color: tones.onCanvas, fontSize: 48, fontWeight: "900", letterSpacing: -2, fontVariant: ["tabular-nums"] },
  summaryTitle: { color: tones.onCanvas, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  summaryCaption: { color: tones.quietOnCanvas, fontSize: 13 },
  metrics: { gap: 9, flexShrink: 1 },
  metricVertical: { borderLeftWidth: 1, paddingLeft: 10 },
  metricHorizontal: { borderTopWidth: 1, paddingTop: 10 },
  metric: { flexDirection: "row", gap: 7, alignItems: "center" },
  metricText: { color: tones.onCanvas, fontSize: 14, flexShrink: 1 },
  timeline: { gap: 17 },
  group: { gap: 8 },
  day: { fontSize: 17, fontWeight: "800" },
  track: { borderLeftWidth: 1, marginLeft: 6, paddingLeft: 12, gap: 7 },
  entry: { borderWidth: 1, borderRadius: 11 },
  marker: { position: "absolute", left: -18, top: 23, width: 9, height: 9, borderWidth: 1, borderRadius: 2 },
  entryButton: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 55, padding: 8 },
  entryIcon: { width: 34, height: 34, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  entryCopy: { flex: 1, gap: 2 },
  entryTitle: { fontSize: 15, fontWeight: "800" },
  entryMeta: { fontSize: 12, fontWeight: "600" },
  preview: { fontSize: 13, lineHeight: 18 },
  details: { borderTopWidth: StyleSheet.hairlineWidth, padding: 11, gap: 8 },
  detail: { gap: 2 },
  detailLabel: { fontSize: 12, fontWeight: "700" },
  detailValue: { fontSize: 14, lineHeight: 20 },
})
