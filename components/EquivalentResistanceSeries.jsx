"use client"

import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Text, PerspectiveCamera } from "@react-three/drei"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const Resistor = ({ position, color = "orange" }) => (
  <mesh position={position}>
    <boxGeometry args={[2, 0.5, 0.5]} />
    <meshStandardMaterial color={color} />
  </mesh>
)

const Wire = ({ start, end }) => {
  const midPoint = start.map((coord, i) => (coord + end[i]) / 2)
  const length = Math.sqrt(start.reduce((sum, coord, i) => sum + (coord - end[i]) ** 2, 0))
  return (
    <mesh position={midPoint}>
      <cylinderGeometry args={[0.05, 0.05, length, 16]} />
      <meshStandardMaterial color="gray" />
    </mesh>
  )
}

const Meter = ({ position, label, value, unit }) => (
  <group position={position}>
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="black" />
    </mesh>
    <Text position={[0, 0.6, 0.51]} fontSize={0.2} color="white">
      {label}: {value.toFixed(2)} {unit}
    </Text>
  </group>
)

const EquivalentResistanceSeries = () => {
  const [voltage, setVoltage] = useState(10)
  const [resistor1, setResistor1] = useState(5)
  const [resistor2, setResistor2] = useState(10)
  const equivalentResistance = resistor1 + resistor2
  const current = voltage / equivalentResistance

  return (
    <div className="w-full h-screen flex flex-col md:flex-row">
      <Canvas className="flex-1">
        <color attach="background" args={["#1a1a1a"]} />
        <PerspectiveCamera makeDefault position={[0, 2, 10]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Resistor position={[-2, 0, 0]} color="orange" />
        <Resistor position={[2, 0, 0]} color="red" />
        <Wire start={[-4, 0, 0]} end={[-3, 0, 0]} />
        <Wire start={[-1, 0, 0]} end={[1, 0, 0]} />
        <Wire start={[3, 0, 0]} end={[4, 0, 0]} />
        <Meter position={[-4, 1, 0]} label="I" value={current} unit="A" />
        <Meter position={[4, 1, 0]} label="V" value={voltage} unit="V" />
        <Text position={[-2, 1, 0]} fontSize={0.5} color="white">
          {resistor1.toFixed(1)}Ω
        </Text>
        <Text position={[2, 1, 0]} fontSize={0.5} color="white">
          {resistor2.toFixed(1)}Ω
        </Text>
        <OrbitControls />
      </Canvas>
      <Card className="p-4 m-4 w-full md:w-96">
        <CardHeader>
          <CardTitle>Equivalent Resistance in Series</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Voltage: {voltage.toFixed(1)}V</label>
              <Slider min={1} max={20} step={0.1} value={[voltage]} onValueChange={(value) => setVoltage(value[0])} />
            </div>
            <div>
              <label className="text-sm font-medium">Resistor 1: {resistor1.toFixed(1)}Ω</label>
              <Slider
                min={1}
                max={20}
                step={0.1}
                value={[resistor1]}
                onValueChange={(value) => setResistor1(value[0])}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Resistor 2: {resistor2.toFixed(1)}Ω</label>
              <Slider
                min={1}
                max={20}
                step={0.1}
                value={[resistor2]}
                onValueChange={(value) => setResistor2(value[0])}
              />
            </div>
            <div className="pt-4">
              <p className="text-sm font-medium">Equivalent Resistance: {equivalentResistance.toFixed(2)}Ω</p>
              <p className="text-sm font-medium">Current: {current.toFixed(2)}A</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EquivalentResistanceSeries

