/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useImperativeHandle, useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleProp, Text, View, ViewStyle, LayoutChangeEvent} from 'react-native';

import {LrcLine, AUTO_SCROLL_AFTER_USER_SCROLL} from '../constant';
import useLrc from '../util/use_lrc';
import useCurrentIndex from './use_current_index';
import useLocalAutoScroll from './use_local_auto_scroll';

interface Props {
  lrc: string;
  lineRenderer: ({
    lrcLine,
    index,
    active,
  }: {
    lrcLine: LrcLine;
    index: number;
    active: boolean;
  }) => React.ReactNode;
  currentTime?: number;
  autoScroll?: boolean;
  autoScrollAfterUserScroll?: number;
  onCurrentLineChange?: ({
    index,
    lrcLine,
  }: {
    index: number;
    lrcLine: LrcLine | null;
  }) => void;
  style: StyleProp<ViewStyle>;
  height: number;
  lineHeight: number;
  activeLineHeight: number;
  [key: string]: any;
}

const Lrc = React.forwardRef<
  {
    scrollToCurrentLine: () => void;
    getCurrentLine: () => {
      index: number;
      lrcLine: LrcLine | null;
    };
  },
  Props
>(function Lrc(
  {
    lrc,
    lineRenderer = ({lrcLine: {content}, active}) => (
      <Text
        style={{
          width: '100%', // Ensure the text takes the full width
          textAlign: 'center',
          color: active ? 'white' : 'gray',
          fontSize: active ? 16 : 13,
          opacity: active ? 1 : 0.4,
          fontWeight: active ? '500' : '400',
        }}>
        {content}
      </Text>
    ),
    currentTime = 0,
    autoScroll = true,
    lineHeight = 26,
    activeLineHeight = lineHeight,
    autoScrollAfterUserScroll = AUTO_SCROLL_AFTER_USER_SCROLL,
    onCurrentLineChange,
    height = 500,
    style,
    ...props
  }: Props,
  ref,
) {
  const lrcRef = useRef<ScrollView>(null);
  const lrcLineList = useLrc(lrc);

  const currentIndex = useCurrentIndex({lrcLineList, currentTime});
  const {localAutoScroll, resetLocalAutoScroll, onScroll} = useLocalAutoScroll({
    autoScroll,
    autoScrollAfterUserScroll,
  });

  const [lineHeights, setLineHeights] = useState<number[]>(new Array(lrcLineList.length).fill(0));

  useEffect(() => {
    if (localAutoScroll) {
      lrcRef.current?.scrollTo({
        y: lineHeights.slice(0, currentIndex).reduce((sum, h) => sum + h, 0) || 0,
        animated: true,
      });
    }
  }, [currentIndex, localAutoScroll, lineHeights]);

  useEffect(() => {
    onCurrentLineChange &&
      onCurrentLineChange({
        index: currentIndex,
        lrcLine: lrcLineList[currentIndex] || null,
      });
  }, [lrcLineList, currentIndex, onCurrentLineChange]);

  useImperativeHandle(ref, () => ({
    getCurrentLine: () => ({
      index: currentIndex,
      lrcLine: lrcLineList[currentIndex] || null,
    }),
    scrollToCurrentLine: () => {
      resetLocalAutoScroll();
      lrcRef.current?.scrollTo({
        y: lineHeights.slice(0, currentIndex).reduce((sum, h) => sum + h, 0) || 0,
        animated: true,
      });
    },
  }));

  const handleLayout = (index: number) => (event: LayoutChangeEvent) => {
    const {height} = event.nativeEvent.layout;
    console.log(`Line ${index} height: ${height}`);  // Logging height
    setLineHeights((prev) => {
      const newHeights = [...prev];
      newHeights[index] = height;
      return newHeights;
    });
  };

  const lyricNodeList = useMemo(
    () =>
      lrcLineList.map((lrcLine, index) => (
        <View
          key={lrcLine.id}
          onLayout={handleLayout(index)}
        >
          {lineRenderer({lrcLine, index, active: currentIndex === index})}
        </View>
      )),
    [activeLineHeight, currentIndex, lineHeight, lineRenderer, lrcLineList, lineHeights],
  );

  return (
    <ScrollView
      {...props}
      ref={lrcRef}
      scrollEventThrottle={30}
      onScroll={onScroll}
      style={[style, {height}]}>
      <View>
        {autoScroll ? (
          <View style={{width: '100%', height: 0.45 * height}} />
        ) : null}
        {lyricNodeList}
        {autoScroll ? (
          <View style={{width: '100%', height: 0.5 * height}} />
        ) : null}
      </View>
    </ScrollView>
  );
});

export default Lrc;
