import React, { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"

const SimplifiedDashboard = () => {
  const [todos, setTodos] = useState([
    { id: 1, text: "Complete Math Assignment", completed: false },
    { id: 2, text: "Read Chapter 5", completed: true },
    { id: 3, text: "Prepare for Quiz", completed: false },
  ])
  const [newTodo, setNewTodo] = useState("")

  const toggleTodo = (id) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)))
  }

  const addTodo = () => {
    if (newTodo.trim() !== "") {
      setTodos([...todos, { id: todos.length + 1, text: newTodo, completed: false }])
      setNewTodo("")
    }
  }

  const subjects = [
    { name: "Math", grade: "85%", color: "#FF6B6B", icon: "functions" },
    { name: "Science", grade: "90%", color: "#4ECDC4", icon: "science" },
    { name: "English", grade: "88%", color: "#95A5A6", icon: "book" },
    { name: "History", grade: "92%", color: "#F39C12", icon: "history" },
  ]

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>Alex Johnson</Text>
          <Text style={styles.grade}>Grade 11 • Fall 2024</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Icon name="person" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="trending-up" size={24} color="#4ECDC4" />
          <Text style={styles.statValue}>89%</Text>
          <Text style={styles.statLabel}>Average</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="event" size={24} color="#FF6B6B" />
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Due Soon</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="star" size={24} color="#F39C12" />
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Awards</Text>
        </View>
      </View>

      {/* Subjects Grid */}
      <View style={styles.subjectsGrid}>
        {subjects.map((subject, index) => (
          <TouchableOpacity key={index} style={[styles.subjectCard, { backgroundColor: subject.color }]}>
            <Icon name={subject.icon} size={24} color="#FFF" />
            <Text style={styles.subjectName}>{subject.name}</Text>
            <Text style={styles.subjectGrade}>{subject.grade}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Todo List */}
      <View style={styles.todoContainer}>
        <Text style={styles.sectionTitle}>Tasks</Text>
        {todos.map((todo) => (
          <TouchableOpacity key={todo.id} style={styles.todoItem} onPress={() => toggleTodo(todo.id)}>
            <Icon
              name={todo.completed ? "check-circle" : "radio-button-unchecked"}
              size={24}
              color={todo.completed ? "#4ECDC4" : "#95A5A6"}
            />
            <Text style={[styles.todoText, todo.completed && styles.completedTodoText]}>{todo.text}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.addTodoContainer}>
          <TextInput
            style={styles.addTodoInput}
            value={newTodo}
            onChangeText={setNewTodo}
            placeholder="Add new task..."
            placeholderTextColor="#95A5A6"
          />
          <TouchableOpacity style={styles.addButton} onPress={addTodo}>
            <Icon name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  grade: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "#FFF",
    marginTop: 1,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    justifyContent: "space-between",
  },
  subjectCard: {
    width: "48%",
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  subjectName: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  subjectGrade: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  todoContainer: {
    backgroundColor: "#FFF",
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  todoText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  completedTodoText: {
    textDecorationLine: "line-through",
    color: "#95A5A6",
  },
  addTodoContainer: {
    flexDirection: "row",
    marginTop: 15,
    alignItems: "center",
  },
  addTodoInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F0F0F0",
    borderRadius: 22,
    paddingHorizontal: 20,
    marginRight: 10,
    color: "#333",
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: "#4ECDC4",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
})

export default SimplifiedDashboard

