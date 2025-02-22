import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const ExperimentScreen = () => {

    const customHTML = `
   
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Equivalent Resistance Experiment</title>
    <style>
        body { margin: 0; overflow: hidden; }
        canvas { display: block; }
    </style>
</head>
<body>
    <script type="module">
        import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();

        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // Light
        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(10, 10, 10);
        scene.add(light);

        // Battery
        const batteryGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
        const batteryMaterial = new THREE.MeshStandardMaterial({ color: "black" });
        const battery = new THREE.Mesh(batteryGeometry, batteryMaterial);
        battery.position.set(-3, 0, 0);
        scene.add(battery);

        // Resistors
        const resistorGeometry = new THREE.BoxGeometry(2, 0.5, 0.5);
        const resistorMaterial = new THREE.MeshStandardMaterial({ color: "orange" });

        const resistor1 = new THREE.Mesh(resistorGeometry, resistorMaterial);
        resistor1.position.set(0, 0, 0);
        scene.add(resistor1);

        const resistor2 = new THREE.Mesh(resistorGeometry, resistorMaterial);
        resistor2.position.set(3, 0, 0);
        scene.add(resistor2);

        // Wires
        function createWire(start, end) {
            const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: "black" });
            const wire = new THREE.Line(geometry, material);
            scene.add(wire);
        }

        createWire([-3, 0, 0], [0, 0, 0]);
        createWire([0, 0, 0], [3, 0, 0]);
        createWire([3, 0, 0], [5, 0, 0]);

        camera.position.z = 5;

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    </script>
</body>
</html>
`;

  return (
    <View style={styles.container}>
      <WebView source={{ uri : "http://192.168.0.165:5173/"  }} 
      originWhitelist={["*"]}
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      onMessage={(event) => console.log(event.nativeEvent.data)}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.warn("WebView error: ", nativeEvent);
      }}
      />
    </View>
    
  
   
  
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }
});

export default ExperimentScreen;
