import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const ExperimentScreen = () => {

    const customHTML = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Circular Circuit Diagram</title><style>body{font-family:Arial,sans-serif;background-color:#f0f0f0;display:flex;flex-direction:column;align-items:center;height:100vh;margin:0}.container{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;margin:20px}svg{width:500px;height:500px;background:#fff;border:1px solid #ddd}.clickable{cursor:pointer}.highlight{stroke:red!important;stroke-width:3!important}input{width:60px;margin:5px}</style></head><body><div class="container"><h3>Set Circuit Parameters</h3><label>Battery Voltage (V): <input type="number" id="voltage" value="10" min="1" /></label><label>Resistor 1 (Ω): <input type="number" id="resistor1" value="5" min="1" /></label><label>Resistor 2 (Ω): <input type="number" id="resistor2" value="10" min="1" /></label><button onclick="updateCircuit()">Update Circuit</button></div><div class="container"><h3>Equivalent Resistance & Current</h3><p id="resistanceDisplay">Equivalent Resistance: -- Ω</p><p id="currentDisplay">Current: -- A</p><svg id="circuit" viewBox="0 0 500 500"></svg></div><script>const svg=document.getElementById("circuit");let resistors=[5,10];let voltage=10;let selectedComponent=null;let connections=[];function updateCircuit(){voltage=parseFloat(document.getElementById("voltage").value);resistors[0]=parseFloat(document.getElementById("resistor1").value);resistors[1]=parseFloat(document.getElementById("resistor2").value);svg.innerHTML="";createBattery(250,400,voltage);createResistor(100,250,resistors[0]);createResistor(400,250,resistors[1]);createAmmeter(250,100);updateEquivalentResistance()}function updateEquivalentResistance(){if(connections.length<4){document.getElementById("resistanceDisplay").innerText=`Equivalent Resistance: -- Ω (Incomplete Connections)`;document.getElementById("currentDisplay").innerText=`Current: -- A`;return}let totalResistance=resistors.reduce((acc,val)=>acc+val,0);let current=voltage/totalResistance;document.getElementById("resistanceDisplay").innerText=`Equivalent Resistance: ${totalResistance} Ω`;document.getElementById("currentDisplay").innerText=`Current: ${current.toFixed(2)} A`}function createResistor(x,y,value){const group=document.createElementNS("http://www.w3.org/2000/svg","g");group.setAttribute("class","clickable");group.setAttribute("data-x",x);group.setAttribute("data-y",y);group.innerHTML=`<text x="${x}" y="${y-15}" text-anchor="middle" fill="black" font-size="12">${value}Ω</text><rect x="${x-15}" y="${y-5}" width="30" height="10" fill="none" stroke="black" stroke-width="2" class="connection-point" />`;group.addEventListener("click",handleComponentClick);svg.appendChild(group)}function createBattery(x,y,value){const group=document.createElementNS("http://www.w3.org/2000/svg","g");group.setAttribute("class","clickable");group.setAttribute("data-x",x);group.setAttribute("data-y",y);group.innerHTML=`<text x="${x}" y="${y-20}" text-anchor="middle" fill="black" font-size="12">${value}V</text><rect x="${x-10}" y="${y-10}" width="20" height="20" fill="none" stroke="black" stroke-width="2" class="connection-point" />`;group.addEventListener("click",handleComponentClick);svg.appendChild(group)}function createAmmeter(x,y){const group=document.createElementNS("http://www.w3.org/2000/svg","g");group.setAttribute("class","clickable");group.setAttribute("data-x",x);group.setAttribute("data-y",y);group.innerHTML=`<text x="${x}" y="${y+30}" text-anchor="middle" fill="black" font-size="12">A</text><circle cx="${x}" cy="${y}" r="20" fill="none" stroke="black" stroke-width="2" class="connection-point" />`;group.addEventListener("click",handleComponentClick);svg.appendChild(group)}function createWire(x1,y1,x2,y2){const line=document.createElementNS("http://www.w3.org/2000/svg","line");line.setAttribute("x1",x1);line.setAttribute("y1",y1);line.setAttribute("x2",x2);line.setAttribute("y2",y2);line.setAttribute("stroke","black");line.setAttribute("stroke-width","2");svg.appendChild(line)}function handleComponentClick(event){const x=parseInt(event.currentTarget.getAttribute("data-x"));const y=parseInt(event.currentTarget.getAttribute("data-y"));if(!selectedComponent){selectedComponent={x,y,element:event.currentTarget};event.currentTarget.querySelector(".connection-point").classList.add("highlight")}else{createWire(selectedComponent.x,selectedComponent.y,x,y);connections.push({x1:selectedComponent.x,y1:selectedComponent.y,x2:x,y2:y});selectedComponent.element.querySelector(".connection-point").classList.remove("highlight");selectedComponent=null;updateEquivalentResistance()}}updateCircuit()</script></body></html>';

  return (
    <View style={styles.container}>
      <WebView source={{ html : customHTML  }} 
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
