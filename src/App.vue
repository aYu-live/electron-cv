<template>
    <el-container class="app-container">
        <el-header>
            <h1>摄像头条码识别与自动录屏</h1>
        </el-header>
        <el-main>
            <CameraRecorder />
        </el-main>
    </el-container>
</template>

<script setup>
import CameraRecorder from './components/CameraRecorder.vue'
</script>

<style scoped>
.app-container {
    height: 100vh;
}
</style>
