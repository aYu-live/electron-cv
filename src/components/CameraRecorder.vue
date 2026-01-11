<template>
    <div class="camera-container">
        <el-form :inline="true" label-width="100px">
            <el-form-item label="录制时长(秒)">
                <el-input-number v-model="durationSeconds" :min="1" :max="120" />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" :disabled="!isCameraOn || isScanning" @click="onStartScan">
                    开启识别
                </el-button>
                <el-button type="default" :disabled="!isScanning" @click="onStopScan">
                    停止识别
                </el-button>
            </el-form-item>
        </el-form>

        <div class="video-wrapper">
            <video ref="videoRef" class="video-element" autoplay playsinline muted></video>
        </div>

        <div>
            <p>摄像头状态：{{ isCameraOn ? '已开启' : '未开启' }}</p>
            <p>识别状态：{{ isScanning ? '识别中...' : '未识别' }}</p>
            <p v-if="lastDetectedValue">最近识别到的条码：{{ lastDetectedValue }}</p>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { startContinuousDecodeFromVideo, stopDecoding } from '@/services/barcodeService'
import { saveVideo } from '@/services/ipcService'

const videoRef = ref(null)
const streamRef = ref(null)
const mediaRecorderRef = ref(null)
const recordTimeoutRef = ref(null)
const recordedChunksRef = ref([])

const isCameraOn = ref(false)
const isScanning = ref(false)
const isRecording = ref(false)
const durationSeconds = ref(15)
const lastDetectedValue = ref('')

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        streamRef.value = stream
        if (videoRef.value) {
            videoRef.value.srcObject = stream
            await videoRef.value.play()
            isCameraOn.value = true
        }
    } catch (err) {
        console.error('无法打开摄像头', err)
        ElMessage.error('无法打开摄像头，请检查权限设置')
    }
}

async function onStartScan() {
    if (!videoRef.value) return
    if (!streamRef.value) {
        await startCamera()
    }
    try {
        isScanning.value = true
        await startContinuousDecodeFromVideo(
            videoRef.value,
            (result) => {
                if (!result || !result.getText) return
                const text = result.getText()
                if (!text) return
                onBarcodeDetected(text)
            },
            (err) => {
                console.error('识别错误', err)
            }
        )
    } catch (err) {
        console.error('启动识别失败', err)
        ElMessage.error('启动识别失败')
        isScanning.value = false
    }
}

function onStopScan() {
    stopDecoding()
    isScanning.value = false
}

function onBarcodeDetected(text) {
    lastDetectedValue.value = text
    if (isRecording.value) return

    ElMessage.success(`识别到条码：${text}，开始录制视频...`)
    isScanning.value = false
    stopDecoding()
    startRecording()
}

function startRecording() {
    if (!streamRef.value) {
        ElMessage.error('没有可用的视频流')
        return
    }

    try {
        recordedChunksRef.value = []
        const options = { mimeType: 'video/webm;codecs=vp9' }
        const mediaRecorder = new MediaRecorder(streamRef.value, options)
        mediaRecorderRef.value = mediaRecorder
        isRecording.value = true

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunksRef.value.push(event.data)
            }
        }

        mediaRecorder.onstop = async () => {
            isRecording.value = false
            const blob = new Blob(recordedChunksRef.value, { type: 'video/webm' })
            const arrayBuffer = await blob.arrayBuffer()
            const buffer = new Uint8Array(arrayBuffer)

            try {
                const result = await saveVideo(Array.from(buffer), 'webm')
                if (result.success) {
                    ElMessage.success(`录制已保存：${result.path}`)
                } else {
                    ElMessage.error(`保存视频失败：${result.error}`)
                }
            } catch (err) {
                console.error('保存视频失败', err)
                ElMessage.error('保存视频失败')
            }
        }

        mediaRecorder.start()

        const ms = Math.max(1, durationSeconds.value) * 1000
        recordTimeoutRef.value = setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop()
            }
        }, ms)
    } catch (err) {
        console.error('开始录制失败', err)
        ElMessage.error('开始录制失败')
        isRecording.value = false
    }
}

function cleanup() {
    try {
        stopDecoding()
    } catch (e) {
        // ignore
    }

    if (recordTimeoutRef.value) {
        clearTimeout(recordTimeoutRef.value)
    }

    if (mediaRecorderRef.value && mediaRecorderRef.value.state !== 'inactive') {
        mediaRecorderRef.value.stop()
    }

    if (streamRef.value) {
        streamRef.value.getTracks().forEach((t) => t.stop())
    }
}

onMounted(() => {
    startCamera()
})

onBeforeUnmount(() => {
    cleanup()
})
</script>
