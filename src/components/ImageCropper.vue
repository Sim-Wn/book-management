<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="裁剪图片"
    width="640px"
    destroy-on-close
    @closed="destroyCropper"
  >
    <div v-if="!src" class="cropper-placeholder" @click="selectFile">
      <el-icon size="48"><Plus /></el-icon>
      <p>点击选择图片</p>
    </div>
    <div v-else class="cropper-area">
      <img ref="image" :src="src" style="max-width:100%;display:block" />
    </div>
    <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />
    <template #footer>
      <el-button @click="selectFile">选择图片</el-button>
      <el-button type="primary" @click="doCrop" :disabled="!src">确认裁剪</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import Cropper from 'cropperjs'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  aspectRatio: { type: Number, default: NaN },
})

const emit = defineEmits(['update:modelValue', 'crop'])

const src = ref('')
const image = ref(null)
const fileInput = ref(null)
let cropper = null

function selectFile() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    src.value = ev.target.result
    nextTick(() => initCropper())
  }
  reader.readAsDataURL(file)
}

function initCropper() {
  destroyCropper()
  if (!image.value) return
  cropper = new Cropper(image.value, {
    aspectRatio: props.aspectRatio || NaN,
    viewMode: 1,
    autoCropArea: 0.8,
    responsive: true,
  })
}

function destroyCropper() {
  if (cropper) { cropper.destroy(); cropper = null }
}

async function doCrop() {
  if (!cropper) return
  try {
    const selection = cropper.getCropperSelection()
    if (!selection) return
    const canvas = await selection.$toCanvas({ width: 800 })
    canvas.toBlob((blob) => {
      const file = new File([blob], 'cropped-' + Date.now() + '.jpg', { type: 'image/jpeg' })
      emit('crop', file)
      src.value = ''
      emit('update:modelValue', false)
    }, 'image/jpeg', 0.9)
  } catch (e) {
    console.error('Crop error:', e)
  }
}

watch(() => props.modelValue, (v) => {
  if (!v) { src.value = ''; destroyCropper() }
})
</script>

<style scoped>
.cropper-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 300px; border: 2px dashed #d0c8b8; border-radius: 8px;
  color: #a09080; cursor: pointer; transition: all .2s;
}
.cropper-placeholder:hover { border-color: #8b6040; color: #8b6040; background: #fdf8f2; }
.cropper-placeholder p { margin-top: 8px; font-size: 14px; }
.cropper-area { max-height: 420px; }
</style>
