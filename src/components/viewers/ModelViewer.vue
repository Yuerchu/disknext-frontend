<script setup lang="ts">
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  GridHelper,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three'
import type { OrbitControls as OrbitControlsType } from 'three/addons/controls/OrbitControls.js'
import { useI18n } from 'vue-i18n'
import { getFileExtension } from '../../composables/useFileOpen'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()

const { t } = useI18n()

const containerRef = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const wireframe = ref(false)

let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let renderer: WebGLRenderer | null = null
let controls: OrbitControlsType | null = null
let animationId: number | null = null
let loadedObject: Object3D | null = null

function isDark(): boolean {
  return document.documentElement.classList.contains('dark')
}

function getBgColor(): number {
  return isDark() ? 0x18181b : 0xf4f4f5
}

function initScene() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()

  scene = new Scene()
  scene.background = new Color(getBgColor())

  camera = new PerspectiveCamera(50, rect.width / rect.height, 0.01, 10000)
  camera.position.set(0, 1, 3)

  renderer = new WebGLRenderer({ antialias: true })
  renderer.setSize(rect.width, rect.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  containerRef.value.appendChild(renderer.domElement)

  import('three/addons/controls/OrbitControls.js').then(({ OrbitControls }) => {
    if (!camera || !renderer) return
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1
  })

  // Lights
  scene.add(new AmbientLight(0xffffff, 0.6))
  const dirLight = new DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 10, 7.5)
  scene.add(dirLight)
  const dirLight2 = new DirectionalLight(0xffffff, 0.3)
  dirLight2.position.set(-5, -5, -5)
  scene.add(dirLight2)

  // Grid
  const grid = new GridHelper(10, 20, 0x888888, 0x444444)
  ;(grid.material as Material).opacity = 0.3
  ;(grid.material as Material).transparent = true
  scene.add(grid)

  animate()
}

function animate() {
  animationId = requestAnimationFrame(animate)
  controls?.update()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

function fitCameraToObject(object: Object3D) {
  if (!camera || !controls) return
  const box = new Box3().setFromObject(object)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.fov * (Math.PI / 180)
  const dist = (maxDim / (2 * Math.tan(fov / 2))) * 1.5

  camera.position.set(center.x, center.y + maxDim * 0.3, center.z + dist)
  controls.target.copy(center)
  controls.update()
  camera.near = dist / 100
  camera.far = dist * 100
  camera.updateProjectionMatrix()
}

async function loadModel() {
  if (!scene) return
  const ext = getFileExtension(props.fileName)

  try {
    let object: Object3D

    if (ext === 'gltf' || ext === 'glb') {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
      const gltf = await new GLTFLoader().loadAsync(props.fileUrl)
      object = gltf.scene
    } else if (ext === 'stl') {
      const { STLLoader } = await import('three/addons/loaders/STLLoader.js')
      const geometry = await new STLLoader().loadAsync(props.fileUrl)
      object = new Mesh(geometry, new MeshStandardMaterial({ color: 0x808080 }))
    } else if (ext === 'obj') {
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js')
      const object3d = await new OBJLoader().loadAsync(props.fileUrl)
      object = object3d
    } else if (ext === 'fbx') {
      const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js')
      object = await new FBXLoader().loadAsync(props.fileUrl)
    } else if (ext === 'ply') {
      const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js')
      const geometry = await new PLYLoader().loadAsync(props.fileUrl)
      geometry.computeVertexNormals()
      object = new Mesh(geometry, new MeshStandardMaterial({ color: 0x808080 }))
    } else if (ext === '3mf') {
      const { ThreeMFLoader } = await import('three/addons/loaders/3MFLoader.js')
      object = await new ThreeMFLoader().loadAsync(props.fileUrl)
    } else {
      throw new Error('Unsupported format')
    }

    loadedObject = object
    scene.add(object)
    fitCameraToObject(object)
    loading.value = false
  } catch {
    error.value = t('viewer.model.loadError')
    loading.value = false
  }
}

function toggleWireframe() {
  wireframe.value = !wireframe.value
      loadedObject?.traverse((child) => {
    if (child instanceof Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((mat: Material) => {
        if ('wireframe' in mat) (mat as MeshStandardMaterial).wireframe = wireframe.value
      })
    }
  })
}

function resetCamera() {
  if (loadedObject) fitCameraToObject(loadedObject)
}

function onResize() {
  if (!containerRef.value || !camera || !renderer) return
  const rect = containerRef.value.getBoundingClientRect()
  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
  renderer.setSize(rect.width, rect.height)
}

onMounted(() => {
  initScene()
  loadModel()
  window.addEventListener('resize', onResize)

  const observer = new MutationObserver(() => {
    if (scene) scene.background = new Color(getBgColor())
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  onBeforeUnmount(() => observer.disconnect())
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (animationId != null) cancelAnimationFrame(animationId)
  controls?.dispose()
  renderer?.dispose()
  scene = null
  camera = null
  renderer = null
  controls = null
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-center gap-2 px-3 py-2 border-b border-default shrink-0">
      <UButton
        :icon="wireframe ? 'i-lucide-box' : 'i-lucide-grid-3x3'"
        :aria-label="t('viewer.model.wireframe')"
        color="neutral"
        :variant="wireframe ? 'soft' : 'ghost'"
        size="sm"
        @click="toggleWireframe"
      />
      <UButton
        icon="i-lucide-scan"
        :aria-label="t('viewer.model.resetCamera')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="resetCamera"
      />
    </div>

    <!-- 3D viewport -->
    <div class="flex-1 overflow-hidden relative">
      <div
        v-if="loading && !error"
        class="absolute inset-0 flex items-center justify-center z-10"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-muted"
        />
      </div>
      <div
        v-if="error"
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10"
      >
        <UIcon
          name="i-lucide-circle-x"
          class="size-10 text-error"
        />
        <p class="text-sm text-muted">
          {{ error }}
        </p>
      </div>
      <div
        ref="containerRef"
        class="w-full h-full"
      />
    </div>
  </div>
</template>
