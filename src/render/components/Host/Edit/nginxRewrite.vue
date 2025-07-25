<template>
  <div class="plant-title">
    <div class="flex items-center justify-between">
      <div class="inline-flex items-center">
        <span>Nginx Url Rewrite</span>
        <el-popover placement="top" :title="I18nT('base.attention')" width="auto" trigger="hover">
          <template #reference>
            <yb-icon
              :svg="import('@/svg/question.svg?raw')"
              width="12"
              height="12"
              style="margin-left: 5px"
            ></yb-icon>
          </template>
          <p>{{ I18nT('base.nginxRewriteHint') }}</p>
        </el-popover>
      </div>
      <template v-if="nginxRewriteFile">
        <el-dropdown size="small" split-button @click="shell.showItemInFolder(nginxRewriteFile)">
          {{ I18nT('base.open') }}
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click.stop="Project.openPath(nginxRewriteFile, 'VSCode')">{{
                I18nT('nodejs.VSCode')
              }}</el-dropdown-item>
              <el-dropdown-item @click.stop="Project.openPath(nginxRewriteFile, 'PhpStorm')">{{
                I18nT('nodejs.PhpStorm')
              }}</el-dropdown-item>
              <el-dropdown-item @click.stop="Project.openPath(nginxRewriteFile, 'WebStorm')">{{
                I18nT('nodejs.WebStorm')
              }}</el-dropdown-item>
              <el-dropdown-item @click.stop="Project.openPath(nginxRewriteFile, 'Sublime')"
                >Sublime Text</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </div>
  </div>
  <div class="main p-5">
    <div class="flex items-center gap-3">
      <el-select
        v-model="rewriteKey"
        filterable
        :placeholder="I18nT('base.commonTemplates')"
        class="flex-1"
        @change="rewriteChange"
      >
        <template v-if="isEmptyCustomRewrites">
          <el-option v-for="(_v, _k) in rewriteDefault" :key="_k" :label="_v.name" :value="_k">
          </el-option>
        </template>
        <template v-else>
          <el-option-group :label="I18nT('toolType.Custom')">
            <el-option v-for="(_v, _k) in rewriteCustom" :key="_k" :label="_v.name" :value="_k">
            </el-option>
          </el-option-group>
          <el-option-group :label="I18nT('base.default')">
            <el-option v-for="(_v, _k) in rewriteDefault" :key="_k" :label="_v.name" :value="_k">
            </el-option>
          </el-option-group>
        </template>
      </el-select>
      <el-button
        :icon="FolderOpened"
        @click.stop="shell.openPath(nginxRewriteTemplateDir)"
      ></el-button>
    </div>
    <div ref="input" class="input-textarea nginx-rewrite"></div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, nextTick, ref, watch, onMounted, onUnmounted } from 'vue'
  import type { editor } from 'monaco-editor/esm/vs/editor/editor.api.js'
  import { I18nT } from '@lang/index'
  import { EditorConfigMake, EditorCreate, EditorDestroy } from '@/util/Editor'
  import { FolderOpened } from '@element-plus/icons-vue'
  import { Project } from '@/util/Project'
  import { HostNginxRewriteSetup } from '@/components/Host/Edit/rewrite'
  import { join } from '@/util/path-browserify'
  import { fs, shell } from '@/util/NodeFn'

  const props = defineProps<{
    modelValue: string
    itemName: string
  }>()

  const emits = defineEmits(['update:modelValue'])

  const input = ref()

  const nginxRewriteTemplateDir = join(window.Server.BaseDir!, 'NginxRewriteTemplate')

  HostNginxRewriteSetup.initNginxRewrites()
  HostNginxRewriteSetup.initNginxRewriteCustomWatch()

  const rewriteDefault = computed(() => {
    return HostNginxRewriteSetup.nginxRewriteDefault
  })

  const rewriteCustom = computed(() => {
    return HostNginxRewriteSetup.nginxRewriteCustom
  })

  const isEmptyCustomRewrites = computed(() => {
    return Object.keys(rewriteCustom).length === 0
  })

  const rewriteKey = ref('')

  const nginxRewriteFileExists = ref(false)

  const nginxRewriteFile = computed(() => {
    const rewritepath = join(window.Server.BaseDir!, 'vhost/rewrite')
    const rewritep = join(rewritepath, `${props.itemName}.conf`)
    return rewritep
  })

  watch(
    nginxRewriteFile,
    (v) => {
      if (v) {
        fs.existsSync(v).then((exists: boolean) => {
          nginxRewriteFileExists.value = exists
        })
      } else {
        nginxRewriteFileExists.value = false
      }
    },
    {
      immediate: true
    }
  )

  const readNginxRewriteFromFile = () => {
    if (!nginxRewriteFileExists.value) {
      return
    }
    try {
      fs.readFile(nginxRewriteFile.value).then((str: string) => {
        emits('update:modelValue', str)
        monacoInstance?.setValue?.(str)
      })
    } catch {
      /* empty */
    }
  }

  watch(
    nginxRewriteFileExists,
    (v) => {
      if (v) {
        readNginxRewriteFromFile()
        HostNginxRewriteSetup.initFileWatch(nginxRewriteFile.value, readNginxRewriteFromFile)
      }
    },
    {
      immediate: true
    }
  )

  let monacoInstance: editor.IStandaloneCodeEditor | undefined

  const initEditor = async () => {
    if (!monacoInstance) {
      if (!input?.value?.style) {
        return
      }
      const config = await EditorConfigMake(props.modelValue, false, 'off')
      Object.assign(config, {
        minimap: {
          enabled: false
        },
        lineNumbers: 'off',
        padding: {
          top: 8,
          bottom: 8
        }
      })
      monacoInstance = EditorCreate(input.value, config)

      monacoInstance.onDidChangeModelContent(() => {
        if (!monacoInstance) {
          return
        }
        const currentValue = monacoInstance?.getValue()
        if (props.modelValue !== currentValue) {
          emits('update:modelValue', currentValue)
        }
      })
    } else {
      monacoInstance.setValue(props.modelValue)
    }
  }

  const rewriteChange = (file: string) => {
    if (HostNginxRewriteSetup.nginxRewriteCustom[file]) {
      const item = HostNginxRewriteSetup.nginxRewriteCustom[file]
      if (!item.content) {
        fs.readFile(file).then((content) => {
          item.content = content
          emits('update:modelValue', content)
          monacoInstance?.setValue(content)
        })
      } else {
        emits('update:modelValue', item.content)
        monacoInstance?.setValue(item.content)
      }
      return
    }

    if (HostNginxRewriteSetup.nginxRewriteDefault[file]) {
      const item = HostNginxRewriteSetup.nginxRewriteDefault[file]
      if (!item.content) {
        fs.readFile(file).then((content) => {
          item.content = content
          emits('update:modelValue', content)
          monacoInstance?.setValue(content)
        })
      } else {
        emits('update:modelValue', item.content)
        monacoInstance?.setValue(item.content)
      }
      return
    }
  }

  onMounted(() => {
    nextTick().then(() => {
      initEditor()
    })
  })
  onUnmounted(() => {
    EditorDestroy(monacoInstance)
    HostNginxRewriteSetup.deinitFileWatch()
    HostNginxRewriteSetup.deinitNginxRewriteCustomWatch()
    console.log('onUnmounted !!!!')
  })
</script>
