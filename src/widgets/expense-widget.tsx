// `reactCompiler` is on in app.json, and the compiler rewrites components to
// use hooks internally. react-native-android-widget does not run a React
// renderer — it walks the returned element tree to build RemoteViews — so a
// compiled component throws "Invalid Hook Call" and the widget renders empty.
'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { Summary } from '@/features/transactions/summary';
import { baht } from '@/lib/format';
import { color } from '@/theme/tokens';

export type ExpenseWidgetProps = {
  monthLabel: string;
  slipCount: number;
  summary: Summary;
};

/** As many category rows as fit a 4×2 cell without the bar being squeezed out. */
const MAX_ROWS = 3;

/**
 * RemoteViews cannot blur, so this deliberately does not try to look like the
 * glass cards in the app — solid fills, a thin border, and the same category
 * colour ramp as the home screen's bar. The total reflects whatever `summary`
 * was built from; the caller decides when that is fresh enough to show
 * (immediately on save, not waiting for a category — see refresh-widget.ts).
 *
 * The canvas drew this card at its content height with a full month of data.
 * A real 4×2 widget is a fixed box, so with a quiet month the same layout left
 * half the panel blank. The breakdown rows below the bar are what fill it: they
 * answer "where did it go" at a glance, and they collapse to a single line of
 * guidance when there is nothing to break down yet.
 */
export function ExpenseWidget({ monthLabel, slipCount, summary }: ExpenseWidgetProps) {
  const rows = summary.slices.slice(0, MAX_ROWS);
  const hidden = summary.slices.length - rows.length;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: color.white,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e4e7ee',
        padding: 14,
      }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <FlexWidget
          style={{
            width: 14,
            height: 14,
            borderRadius: 5,
            backgroundColor: color.accent,
            marginRight: 8,
          }}
        />
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text={monthLabel}
            style={{ fontSize: 11.5, fontWeight: '500', color: color.textMuted }}
          />
        </FlexWidget>
        <TextWidget
          text={`${slipCount} สลิป`}
          style={{ fontSize: 11, color: color.textFaint }}
        />
      </FlexWidget>

      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'expensetracker://' }}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 4,
        }}>
        <TextWidget
          text={baht(summary.total)}
          style={{ fontSize: 26, fontWeight: '600', color: color.text }}
        />
        <FlexWidget
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: '#e9edfb',
          }}>
          <TextWidget
            text="เพิ่มสลิป"
            style={{ fontSize: 11, fontWeight: '600', color: color.accentInk }}
          />
        </FlexWidget>
      </FlexWidget>

      {summary.slices.length > 0 ? (
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            height: 6,
            marginTop: 8,
            flexGapColor: color.white,
            flexGap: 3,
          }}>
          {summary.slices.map((slice) => (
            <FlexWidget
              key={slice.key}
              style={{
                flex: Math.max(slice.amount, 1),
                height: 'match_parent',
                borderRadius: 999,
                backgroundColor: slice.fill as `#${string}`,
              }}
            />
          ))}
        </FlexWidget>
      ) : null}

      {/* The breakdown. `slices` already leads with the uncategorised bucket, so
          the row most worth acting on sits at the top without special-casing. */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: summary.pendingCount > 0 ? 'expensetracker://pending' : 'expensetracker://' }}
        style={{
          flex: 1,
          width: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          marginTop: 6,
        }}>
        {rows.length > 0 ? (
          rows.map((slice) => (
            <FlexWidget
              key={slice.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                width: 'match_parent',
                marginTop: 3,
                marginBottom: 3,
              }}>
              <FlexWidget
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: slice.fill as `#${string}`,
                  marginRight: 8,
                }}
              />
              <FlexWidget style={{ flex: 1 }}>
                <TextWidget
                  text={slice.label}
                  style={{ fontSize: 11.5, color: color.textSecondary }}
                  truncate="END"
                  maxLines={1}
                />
              </FlexWidget>
              <TextWidget
                text={baht(slice.amount)}
                style={{ fontSize: 11.5, fontWeight: '600', color: color.text }}
              />
            </FlexWidget>
          ))
        ) : (
          <TextWidget
            text="ยังไม่มีสลิปเดือนนี้ — แคปสลิปแล้วแตะเพิ่มสลิป"
            style={{ fontSize: 11.5, color: color.textFaint }}
            truncate="END"
            maxLines={2}
          />
        )}

        {hidden > 0 ? (
          <TextWidget
            text={`+ อีก ${hidden} หมวด`}
            style={{ fontSize: 10.5, color: color.textGhost, marginTop: 2 }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
