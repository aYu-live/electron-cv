<template>
    <div class="camera-container">
        <div class="main-layout">
            <!-- 左侧：视频文件管理 -->
            <div class="left-panel">
                <el-card shadow="hover" :body-style="{ padding: '15px', height: '100%' }">
                    <template #header>
                        <div class="panel-header">
                            <div style="display: flex; align-items: center; gap: 5px">
                                <el-icon>
                                    <VideoCamera />
                                </el-icon>
                                <span>视频文件列表</span>
                                <el-tag v-if="currentVideoDir" size="small" type="info">
                                    {{ videoFiles.length }}
                                </el-tag>
                            </div>
                            <el-button size="small" @click="refreshVideoList" :icon="Refresh" circle />
                        </div>
                    </template>

                    <div v-if="currentVideoDir" class="current-dir">
                        <el-icon>
                            <Location />
                        </el-icon>
                        <span>{{ currentVideoDir }}</span>
                    </div>
                    <el-table :data="videoFiles" style="width: 100%; margin-top: 10px" height="580" empty-text="暂无视频文件"
                        size="small" stripe :header-cell-style="{ background: '#f5f7fa', color: '#606266' }">
                        <el-table-column prop="name" label="文件名" min-width="180" show-overflow-tooltip>
                            <template #default="{ row }">
                                <div style="display: flex; align-items: center; gap: 5px">
                                    <el-icon color="#409eff" :size="14">
                                        <VideoCamera />
                                    </el-icon>
                                    <span style="font-size: 12px">{{ row.name }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="size" label="大小" width="80" align="center" />
                        <el-table-column prop="time" label="创建时间" width="140" align="center">
                            <template #default="{ row }">
                                <span style="font-size: 12px">{{ row.time }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="130" align="center" fixed="right">
                            <template #default="{ row }">
                                <el-button size="small" type="primary" link @click="openVideoFile(row.path)"
                                    :icon="VideoPlay">
                                    播放
                                </el-button>
                                <el-button size="small" type="danger" link @click="deleteVideoFile(row)" :icon="Delete">
                                    删除
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-card>
            </div>

            <!-- 右侧：摄像头和控制 -->
            <div class="right-panel">
                <el-card shadow="hover" :body-style="{ padding: '15px' }">
                    <template #header>
                        <div class="panel-header">
                            <div style="display: flex; align-items: center; gap: 5px">
                                <el-icon>
                                    <Camera />
                                </el-icon>
                                <span>摄像头监控与录制</span>
                            </div>
                        </div>
                    </template>

                    <!-- 配置区域 -->
                    <el-form label-width="100px" size="default">
                        <el-form-item label="录制时长">
                            <el-input-number v-model="durationSeconds" :min="1" :max="120" :disabled="isRecording" />
                            <span style="margin-left: 10px; color: #909399">秒</span>
                        </el-form-item>
                        <el-form-item label="保存位置">
                            <el-input v-model="savePath" placeholder="默认保存到视频目录" readonly>
                                <template #append>
                                    <el-button @click="chooseSavePath" :icon="FolderOpened">选择</el-button>
                                </template>
                            </el-input>
                        </el-form-item>
                        <el-form-item label="操作">
                            <el-button type="primary" :disabled="!isCameraOn || isScanning" @click="onStartScan"
                                size="default">
                                <el-icon>
                                    <VideoCamera />
                                </el-icon>
                                开启识别
                            </el-button>
                            <el-button type="default" :disabled="!isScanning" @click="onStopScan" size="default">
                                <el-icon>
                                    <VideoPause />
                                </el-icon>
                                停止识别
                            </el-button>
                        </el-form-item>
                    </el-form>

                    <!-- 视频预览 -->
                    <div class="video-wrapper">
                        <video ref="videoRef" class="video-element" playsinline muted></video>
                    </div>

                    <!-- 状态信息 -->
                    <div class="status-info">
                        <el-descriptions :column="1" border size="small">
                            <el-descriptions-item label="摄像头状态">
                                <el-tag :type="isCameraOn ? 'success' : 'info'" size="small">
                                    {{ isCameraOn ? '已开启' : '未开启' }}
                                </el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="识别状态">
                                <el-tag :type="isScanning ? 'success' : 'info'" size="small">
                                    {{ isScanning ? '识别中' : '未识别' }}
                                </el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="最近条码" v-if="lastDetectedValue">
                                <el-tag type="warning" size="small">{{ lastDetectedValue }}</el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="录制状态" v-if="isRecording">
                                <div style="display: flex; align-items: center; gap: 10px">
                                    <el-tag type="danger" effect="dark" size="small">
                                        <div style="display: flex;">
                                            <el-icon>
                                                <VideoCamera />
                                            </el-icon>
                                            正在录制
                                        </div>
                                    </el-tag>
                                    <span style="font-size: 13px; color: #606266">
                                        {{ recordingElapsed }}s / {{ durationSeconds }}s (剩余 {{ recordingRemaining }}s)
                                    </span>
                                </div>
                            </el-descriptions-item>
                        </el-descriptions>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    VideoCamera,
    VideoPlay,
    Refresh,
    Location,
    Camera,
    VideoPause,
    FolderOpened,
    Delete
} from '@element-plus/icons-vue'
import { startContinuousDecodeFromVideo, pauseDecoding, resumeDecoding, stopDecoding } from '../services/barcodeService'
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
const savePath = ref('')
const recordingElapsed = ref(0)
const recordingRemaining = ref(0)
const recordingIntervalRef = ref(null)
const recordingStartTime = ref(0)
const videoFiles = ref([])
const currentVideoDir = ref('')
const fileWatcherActive = ref(false)

async function chooseSavePath() {
    try {
        const result = await window.electronAPI.chooseSavePath()
        if (result.success && result.path) {
            savePath.value = result.path
            ElMessage.success(`保存位置已设置：${result.path}`)
            // 切换目录后重新启动监听
            await stopWatchingDirectory()
            await refreshVideoList()
            await startWatchingDirectory()
        }
    } catch (err) {
        console.error('选择保存路径失败', err)
        ElMessage.error('选择保存路径失败')
    }
}

async function getDefaultSavePath() {
    try {
        const result = await window.electronAPI.getDefaultPath()
        if (result.success && result.path) {
            // 如果用户还没有设置过保存路径，使用默认路径
            if (!savePath.value) {
                savePath.value = result.path
                currentVideoDir.value = result.path
            }
        }
    } catch (err) {
        console.error('获取默认路径失败', err)
    }
}

async function startWatchingDirectory() {
    try {
        const dir = savePath.value || ''
        const result = await window.electronAPI.startWatchDirectory(dir)
        if (result.success) {
            fileWatcherActive.value = true
            console.log('开始监听目录:', result.dir)
        }
    } catch (err) {
        console.error('启动目录监听失败', err)
    }
}

async function stopWatchingDirectory() {
    try {
        if (fileWatcherActive.value) {
            await window.electronAPI.stopWatchDirectory()
            fileWatcherActive.value = false
            console.log('停止监听目录')
        }
    } catch (err) {
        console.error('停止目录监听失败', err)
    }
}

async function refreshVideoList() {
    try {
        const dir = savePath.value || ''
        const result = await window.electronAPI.getVideoList(dir)
        if (result.success) {
            videoFiles.value = result.files || []
            currentVideoDir.value = result.dir || ''
        } else {
            ElMessage.error('获取视频列表失败')
        }
    } catch (err) {
        console.error('获取视频列表失败', err)
    }
}

async function openVideoFile(filePath) {
    try {
        await window.electronAPI.openFile(filePath)
    } catch (err) {
        console.error('打开文件失败', err)
        ElMessage.error('打开文件失败')
    }
}

async function deleteVideoFile(row) {
    try {
        await ElMessageBox.confirm(
            `确定要删除文件 "${row.name}" 吗？此操作不可恢复！`,
            '确认删除',
            {
                confirmButtonText: '删除',
                cancelButtonText: '取消',
                type: 'warning',
                confirmButtonClass: 'el-button--danger'
            }
        )

        // 用户确认删除
        const result = await window.electronAPI.deleteFile(row.path)
        if (result.success) {
            ElMessage.success('文件已删除')
            // 文件监听器会自动刷新列表
        } else {
            ElMessage.error(`删除失败：${result.error}`)
        }
    } catch (err) {
        // 用户取消或其他错误
        if (err !== 'cancel') {
            console.error('删除文件失败', err)
            ElMessage.error('删除文件失败')
        }
    }
}

async function startCamera() {
    try {
        console.log('尝试打开摄像头...')
        console.log('navigator.mediaDevices 是否存在:', !!navigator.mediaDevices)
        console.log('getUserMedia 是否存在:', !!navigator.mediaDevices?.getUserMedia)

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        console.log('摄像头流获取成功:', stream)
        console.log('视频轨道数:', stream.getVideoTracks().length)
        console.log('视频轨道状态:', stream.getVideoTracks()[0]?.readyState)
        console.log('视频轨道启用:', stream.getVideoTracks()[0]?.enabled)

        streamRef.value = stream

        // 等待一下确保 DOM 完全准备好
        await new Promise(resolve => setTimeout(resolve, 50))

        if (!videoRef.value) {
            console.error('视频元素不存在！')
            ElMessage.error('视频元素初始化失败')
            return
        }

        console.log('视频元素存在，准备设置 srcObject')
        console.log('视频元素 DOM 状态:', videoRef.value.readyState)

        // 确保清除任何旧的 srcObject
        if (videoRef.value.srcObject) {
            console.log('检测到旧的 srcObject，清除中...')
            videoRef.value.srcObject = null
            await new Promise(resolve => setTimeout(resolve, 50))
        }

        // 先设置属性，但不设置 autoplay，由 play() 手动控制
        videoRef.value.muted = true
        videoRef.value.playsInline = true
        console.log('视频元素属性已设置: muted=true, playsInline=true')

        // 设置视频元素事件监听（在设置 srcObject 之前）
        videoRef.value.oncanplay = () => {
            console.log('视频可以播放了')
        }

        videoRef.value.onplaying = () => {
            console.log('视频正在播放')
        }

        videoRef.value.onloadstart = () => {
            console.log('开始加载视频')
        }

        videoRef.value.onerror = (e) => {
            console.error('视频元素错误:', e)
            if (videoRef.value.error) {
                console.error('错误代码:', videoRef.value.error.code)
                console.error('错误消息:', videoRef.value.error.message)
            }
        }

        console.log('事件监听器已设置')

        // 设置 srcObject 并等待 loadedmetadata 事件
        const metadataPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('loadedmetadata timeout'))
            }, 5000)

            videoRef.value.onloadedmetadata = () => {
                clearTimeout(timeout)
                console.log('视频元数据加载完成, 尺寸:', videoRef.value.videoWidth, 'x', videoRef.value.videoHeight)
                resolve()
            }
        })

        videoRef.value.srcObject = stream
        console.log('srcObject 已设置，等待元数据加载...')

        try {
            // 等待元数据加载完成
            await metadataPromise
            console.log('元数据已加载，开始播放')
        } catch (error) {
            console.error('等待元数据超时:', error)
        }

        // 不等待 play() 完成，直接调用并继续
        const playPromise = videoRef.value.play()
        console.log('video.play() 已调用')

        // 在后台处理 play promise，不阻塞主流程
        playPromise.then(() => {
            console.log('video.play() Promise 解析成功')
        }).catch((playError) => {
            console.error('video.play() Promise 被拒绝:', playError)
            console.error('错误名称:', playError.name)
            console.error('错误消息:', playError.message)
        })

        isCameraOn.value = true
        console.log('摄像头已成功启动，isCameraOn 设置为 true')

        // 等待多次，检查视频是否开始播放
        const checkVideoStatus = async () => {
            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 100))
                console.log(`检查 ${i + 1}/10: 宽度=${videoRef.value.videoWidth}, 高度=${videoRef.value.videoHeight}, readyState=${videoRef.value.readyState}, paused=${videoRef.value.paused}`)

                if (videoRef.value.videoWidth > 0 && videoRef.value.videoHeight > 0) {
                    console.log('✅ 视频已成功加载！')
                    break
                }

                // 如果视频暂停了，尝试再次播放
                if (videoRef.value.paused && i > 2) {
                    console.log('视频仍然暂停，尝试再次调用 play()')
                    videoRef.value.play().catch(e => console.error('重试 play() 失败:', e))
                }
            }
        }

        checkVideoStatus().then(() => {
            console.log('=== 最终状态检查 ===')
            console.log('视频宽度:', videoRef.value.videoWidth, '高度:', videoRef.value.videoHeight)
            console.log('视频元素 readyState:', videoRef.value.readyState, '(4=HAVE_ENOUGH_DATA)')
            console.log('视频元素 paused:', videoRef.value.paused)
            console.log('视频元素 ended:', videoRef.value.ended)
            console.log('视频流 active:', stream.active)
        })

    } catch (err) {
        console.error('无法打开摄像头', err)
        console.error('错误类型:', err.name)
        console.error('错误消息:', err.message)
        console.error('错误堆栈:', err.stack)
        ElMessage.error(`无法打开摄像头: ${err.message}`)
    }
}

async function onStartScan() {
    if (!videoRef.value) {
        console.error('视频元素不存在')
        ElMessage.error('视频元素未初始化')
        return
    }

    if (!streamRef.value) {
        console.error('摄像头流不存在')
        ElMessage.error('请等待摄像头启动完成')
        return
    }

    console.log('开始启动条码识别...')
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
        console.log('条码识别已启动')
    } catch (err) {
        console.error('启动识别失败', err)
        ElMessage.error('启动识别失败')
        isScanning.value = false
    }
}

function onStopScan() {
    console.log('停止识别被调用')

    // 如果正在录制，先停止录制并保存
    if (isRecording.value && mediaRecorderRef.value) {
        console.log('检测到正在录制，中断录制并保存...')

        // 清除定时器
        if (recordTimeoutRef.value) {
            clearTimeout(recordTimeoutRef.value)
            recordTimeoutRef.value = null
        }

        // 停止录制（会触发 onstop 事件，自动保存）
        if (mediaRecorderRef.value.state !== 'inactive') {
            mediaRecorderRef.value.stop()
            ElMessage.info('录制已中断并保存')
        }
    }

    // 暂停识别，但保持摄像头开启
    pauseDecoding()
    isScanning.value = false
    console.log('识别已停止')
}

function onBarcodeDetected(text) {
    lastDetectedValue.value = text

    // 如果已经在录制中，忽略新的条码
    if (isRecording.value) {
        console.log('录制中，忽略新条码:', text)
        return
    }

    ElMessage.success(`识别到条码：${text}，开始录制视频...`)

    // 开始录制
    startRecording()
}

function startRecording() {
    if (!streamRef.value) {
        ElMessage.error('没有可用的视频流')
        return
    }

    try {
        recordedChunksRef.value = []

        // 尝试多种 mimeType，优先 mp4/h264，按支持情况选择
        const mimeTypes = [
            'video/mp4',
            'video/webm;codecs=h264',
            'video/webm;codecs=vp9',
            'video/webm'
        ]

        let selectedMimeType = 'video/webm'
        let fileExtension = 'webm'

        for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                selectedMimeType = type
                // 如果是 mp4 或包含 h264，尝试用 mp4 扩展名
                if (type.includes('mp4')) {
                    fileExtension = 'mp4'
                } else if (type.includes('h264')) {
                    fileExtension = 'mp4'
                }
                console.log('使用编码格式:', type, '文件扩展名:', fileExtension)
                break
            }
        }

        const options = { mimeType: selectedMimeType }
        const mediaRecorder = new MediaRecorder(streamRef.value, options)
        mediaRecorderRef.value = mediaRecorder
        isRecording.value = true

        // 初始化录制计时
        recordingStartTime.value = Date.now()
        recordingElapsed.value = 0
        recordingRemaining.value = durationSeconds.value

        // 启动录制进度更新定时器（每100ms更新一次）
        recordingIntervalRef.value = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime.value) / 1000)
            recordingElapsed.value = Math.min(elapsed, durationSeconds.value)
            recordingRemaining.value = Math.max(0, durationSeconds.value - elapsed)
        }, 100)

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunksRef.value.push(event.data)
            }
        }

        mediaRecorder.onstop = async () => {
            isRecording.value = false

            // 清除录制进度定时器
            if (recordingIntervalRef.value) {
                clearInterval(recordingIntervalRef.value)
                recordingIntervalRef.value = null
            }

            const blob = new Blob(recordedChunksRef.value, { type: selectedMimeType })
            const arrayBuffer = await blob.arrayBuffer()
            const buffer = new Uint8Array(arrayBuffer)

            try {
                const result = await saveVideo(Array.from(buffer), fileExtension, savePath.value, lastDetectedValue.value)
                if (result.success) {
                    ElMessage.success(`录制已保存：${result.path}`)
                    // 文件监听器会自动刷新列表，不需要手动调用
                } else {
                    ElMessage.error(`保存视频失败：${result.error}`)
                }
            } catch (err) {
                console.error('保存视频失败', err)
                ElMessage.error('保存视频失败')
            }

            // 录制结束后，继续识别等待下一个条码
            console.log('录制完成，继续等待识别新条码')
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

        // 清除定时器
        if (recordingIntervalRef.value) {
            clearInterval(recordingIntervalRef.value)
            recordingIntervalRef.value = null
        }
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

    if (recordingIntervalRef.value) {
        clearInterval(recordingIntervalRef.value)
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
    // 获取默认保存路径
    getDefaultSavePath()
    // 加载视频列表
    refreshVideoList()
    // 启动目录监听
    startWatchingDirectory()

    // 监听来自主进程的文件变化事件
    window.electronAPI.onFileChanged(() => {
        console.log('检测到文件变化，刷新列表')
        refreshVideoList()
    })
})

onBeforeUnmount(() => {
    cleanup()
    // 停止目录监听
    stopWatchingDirectory()
})
</script>

<style scoped>
.camera-container {
    padding: 20px;
    height: 100vh;
    overflow: hidden;
}

.main-layout {
    display: flex;
    gap: 20px;
    height: calc(100vh - 40px);
}

.left-panel {
    width: 500px;
    flex-shrink: 0;
    overflow: hidden;
}

.right-panel {
    flex: 1;
    min-width: 0;
    overflow: auto;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 16px;
}

.section {
    margin-bottom: 10px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-weight: 600;
    font-size: 14px;
}

.current-dir {
    padding: 8px;
    background: #f5f7fa;
    border-radius: 4px;
    font-size: 12px;
    color: #606266;
    display: flex;
    align-items: center;
    gap: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.video-wrapper {
    margin: 20px 0;
    display: flex;
    justify-content: center;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
}

.video-element {
    width: 100%;
    max-width: 100%;
    height: auto;
    max-height: 400px;
}

.status-info {
    margin-top: 20px;
}

.directory-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 8px;
    margin-bottom: 6px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid transparent;
}

.directory-item:hover {
    background-color: #f0f9ff;
    border-color: #b3d8ff;
    transform: translateX(2px);
}

.directory-item.active {
    background-color: #ecf5ff;
    border-color: #409eff;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.directory-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
}

.directory-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: #606266;
    font-weight: 500;
}

.directory-item.active .directory-path {
    color: #409eff;
    font-weight: 600;
}
</style>