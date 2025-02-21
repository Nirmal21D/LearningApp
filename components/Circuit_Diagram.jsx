"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import Slider from "@react-native-community/slider"
import Svg, { Line, Path, Circle, Text as SvgText } from "react-native-svg"

const Resistor = ({ x, y, value, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Svg>
      <Line x1={x - 30} y1={y} x2={x - 20} y2={y} stroke="black" strokeWidth="2" />
      <Path
        d={`M${x - 20} ${y} L${x - 15} ${y - 5} L${x - 5} ${y + 5} L${x + 5} ${y - 5} L${x + 15} ${y + 5} L${x + 20} ${y}`}
        fill="none"
        stroke="black"
        strokeWidth="2"
      />
      <Line x1={x + 20} y1={y} x2={x + 30} y2={y} stroke="black" strokeWidth="2" />
      <SvgText x={x} y={y - 10} textAnchor="middle" fill="black" fontSize="12">
        {value}Ω
      </SvgText>
    </Svg>
  </TouchableOpacity>
)

const Wire = ({ x1, y1, x2, y2 }) => <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="2" />

const Voltmeter = ({ x, y, value, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Svg>
      <Circle cx={x} cy={y} r="20" fill="white" stroke="black" strokeWidth="2" />
      <SvgText x={x} y={y + 5} textAnchor="middle" fill="black" fontSize="12">
        V
      </SvgText>
      <SvgText x={x} y={y + 25} textAnchor="middle" fill="black" fontSize="10">
        {value.toFixed(1)}V
      </SvgText>
    </Svg>
  </TouchableOpacity>
)

const Ammeter = ({ x, y, value, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Svg>
      <Circle cx={x} cy={y} r="20" fill="white" stroke="black" strokeWidth="2" />
      <SvgText x={x} y={y + 5} textAnchor="middle" fill="black" fontSize="12">
        A
      </SvgText>
      <SvgText x={x} y={y + 25} textAnchor="middle" fill="black" fontSize="10">
        {value.toFixed(2)}A
      </SvgText>
    </Svg>
  </TouchableOpacity>
)

const Battery = ({ x, y, value, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Svg>
      <Line x1={x - 10} y1={y} x2={x + 10} y2={y} stroke="black" strokeWidth="2" />
      <Line x1={x} y1={y - 10} x2={x} y2={y + 10} stroke="black" strokeWidth="2" />
      <SvgText x={x} y={y - 15} textAnchor="middle" fill="black" fontSize="12">
        {value}V
      </SvgText>
    </Svg>
  </TouchableOpacity>
)

const CircuitDiagram = () => {
  const [voltage, setVoltage] = useState(10)
  const [resistor1, setResistor1] = useState(5)
  const [resistor2, setResistor2] = useState(10)
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [connections, setConnections] = useState([])

  const equivalentResistance = resistor1 + resistor2
  const current = voltage / equivalentResistance

  const handleComponentPress = (x, y) => {
    if (!selectedComponent) {
      setSelectedComponent({ x, y })
    } else {
      setConnections([...connections, { x1: selectedComponent.x, y1: selectedComponent.y, x2: x, y2: y }])
      setSelectedComponent(null)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.diagramContainer}>
        <Svg height="300" width="500" viewBox="0 0 500 300">
          {connections.map((wire, index) => (
            <Wire key={index} x1={wire.x1} y1={wire.y1} x2={wire.x2} y2={wire.y2} />
          ))}
          <Battery x={50} y={200} value={voltage} onPress={() => handleComponentPress(50, 200)} />
          <Ammeter x={150} y={50} value={current} onPress={() => handleComponentPress(150, 50)} />
          <Resistor x={250} y={150} value={resistor1} onPress={() => handleComponentPress(250, 150)} />
          <Resistor x={350} y={100} value={resistor2} onPress={() => handleComponentPress(350, 100)} />
          <Voltmeter x={450} y={50} value={voltage} onPress={() => handleComponentPress(450, 50)} />
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f0f0f0",
  },
  diagramContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
})

export default CircuitDiagram
