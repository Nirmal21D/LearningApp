import React, { useState } from 'react';
import { View, Text, PanResponder, Animated, Dimensions } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const MagneticFieldSimulator = () => {
  const [magnetPosition, setMagnetPosition] = useState({ x: width / 2, y: height / 2 });
  const [needleRotation, setNeedleRotation] = useState(new Animated.Value(0));

  // PanResponder to handle the dragging of the magnet
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const { dx, dy } = gestureState;
      setMagnetPosition({
        x: magnetPosition.x + dx,
        y: magnetPosition.y + dy,
      });

      // Update the compass needle direction based on the magnet's position
      const angle = Math.atan2(dy, dx) * (180 / Math.PI); // Angle between magnet and compass
      Animated.timing(needleRotation, {
        toValue: angle,
        duration: 50,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderRelease: () => {},
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      {/* Magnetic field lines */}
      <Svg height={height} width={width}>
        <Circle cx={magnetPosition.x} cy={magnetPosition.y} r="5" fill="red" />
        {/* Optionally draw some lines to simulate magnetic field */}
        <Line x1={magnetPosition.x} y1={magnetPosition.y} x2={magnetPosition.x + 100} y2={magnetPosition.y} stroke="blue" strokeWidth="1" />
        <Line x1={magnetPosition.x} y1={magnetPosition.y} x2={magnetPosition.x} y2={magnetPosition.y + 100} stroke="blue" strokeWidth="1" />
      </Svg>

      {/* Compass */}
      <View style={{ position: 'absolute', top: height / 2 - 50 }}>
        <Svg height="100" width="100">
          <Circle cx="50" cy="50" r="45" stroke="black" strokeWidth="3" fill="white" />
          <Animated.Line
            x1="50"
            y1="10"
            x2="50"
            y2="50"
            stroke="black"
            strokeWidth="3"
            transform={[{ rotate: needleRotation.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) }]}
          />
        </Svg>
        <Text style={{ textAlign: 'center', marginTop: 10 }}>Compass</Text>
      </View>

      {/* Draggable magnet */}
      <Animated.View
        style={{
          width: 60,
          height: 20,
          backgroundColor: 'red',
          position: 'absolute',
          top: magnetPosition.y - 10,
          left: magnetPosition.x - 30,
          borderRadius: 5,
        }}
        {...panResponder.panHandlers}
      />
    </View>
  );
};

export default MagneticFieldSimulator;
