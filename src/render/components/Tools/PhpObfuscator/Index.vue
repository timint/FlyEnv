<template>
  <div class="host-edit tools">
    <div class="nav p-0">
      <div class="left">
        <span class="text-xl">{{ I18nT('util.toolPhpObfuscator') }}</span>
        <slot name="like"></slot>
      </div>
      <el-button type="primary" class="shrink0" :loading="running" @click="doSave">{{
        I18nT('base.generate')
      }}</el-button>
    </div>

    <div class="main-wapper">
      <div class="main flex flex-col gap-7 pt-7">
        <el-select
          v-model="item.phpversion"
          class="w-full"
          :class="errs['phpversion'] ? ' error' : ''"
          :placeholder="I18nT('php.obfuscatorPhpVersion')"
        >
          <template v-for="(item, _index) in phpVersions" :key="_index">
            <el-option :value="item.path + '-' + item.version" :label="item.version"></el-option>
          </template>
        </el-select>
        <el-input
          v-model="item.src"
          :style="{
            '--el-input-border-color': errs['src'] ? '#cc5441' : null
          }"
          :placeholder="I18nT('php.obfuscatorSrc')"
        >
          <template #append>
            <el-button :icon="FolderOpened" @click.stop="chooseSrc()"></el-button>
          </template>
        </el-input>

        <el-input
          v-model="item.desc"
          :disabled="!descType"
          :style="{
            '--el-input-border-color': errs['desc'] ? '#cc5441' : null
          }"
          :placeholder="I18nT('php.obfuscatorDesc')"
        >
          <template #append>
            <el-button :icon="FolderOpened" @click.stop="chooseDesc()"></el-button>
          </template>
        </el-input>
        <div class="path-choose my-5">
          <el-button @click="showConfig()">{{ I18nT('php.obfuscatorConfig') }}</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, nextTick } from 'vue'
  import { BrewStore } from '@/store/brew'
  import IPC from '@/util/IPC'
  import { MessageError, MessageSuccess } from '@/util/Element'
  import { join } from '@/util/path-browserify'
  import { dialog, shell, fs } from '@/util/NodeFn'
  import { AsyncComponentShow } from '@/util/AsyncComponent'
  import { I18nT } from '@lang/index'
  import { FolderOpened } from '@element-plus/icons-vue'

  const running = ref(false)
  const descType = ref('')

  const item = ref({
    phpversion: '',
    src: '',
    desc: '',
    config: ''
  })

  const errs = ref<Record<string, boolean>>({
    phpversion: false,
    src: false,
    desc: false
  })

  const phpVersions = computed(() => {
    return BrewStore()
      .module('php')
      .installed.filter((p) => p.enable && p.num && p?.num > 56)
  })

  watch(
    item,
    () => {
      for (const k in errs.value) {
        errs.value[k] = false
      }
    },
    { deep: true, immediate: true }
  )

  const showConfig = () => {
    import('./Config.vue').then((res) => {
      AsyncComponentShow(res.default, {
        customConfig: item.value.config
      }).then((config) => {
    if (typeof config === 'string') {
      item.value.config = config
    }
      })
    })
  }

  const doSave = async () => {
    if (!checkItem() || running.value) {
      return
    }

    running.value = true
    const php = phpVersions.value.find((p) => `${p.path}-${p.version}` === item.value.phpversion)
    const bin = join(php!.path, 'bin/php')
    const params = JSON.parse(
      JSON.stringify({
        ...item.value,
        bin
      })
    )

    IPC.send('app-fork:php', 'doObfuscator', params).then((key: string, res: any) => {
      IPC.off(key)
      if (res?.code === 0) {
        MessageSuccess(I18nT('base.success'))
        shell.showItemInFolder(item.value.desc)
      } else {
        const msg = res.msg
        import('./Logs.vue').then((res) => {
          AsyncComponentShow(res.default, {
            content: msg
          })
          nextTick().then(() => {
            MessageError(I18nT('base.fail'))
          })
        })
      }
      running.value = false
    })
  }

  const checkItem = () => {
    errs.value.phpversion = item.value.phpversion.length === 0
    errs.value.src = item.value.src.length === 0
    errs.value.desc =
      item.value.desc.length === 0 ||
      item.value.src === item.value.desc ||
      item.value.desc.includes(item.value.src)

    return !Object.values(errs.value).some(Boolean)
  }

  const chooseSrc = async () => {
    const opt = ['openDirectory', 'openFile', 'showHiddenFiles']
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: opt,
      filters: [
        {
          extensions: ['php']
        }
      ]
    })

    if (canceled || filePaths.length === 0) return

    const [path] = filePaths
    const state: any = await fs.stat(path)

    if (state.isDirectory) {
      descType.value = 'dir'
    } else if (state.isFile) {
      descType.value = 'file'
    } else {
      descType.value = ''
      return
    }

    item.value.src = path
    item.value.desc = ''
  }

  const chooseDesc = async () => {
    if (!descType.value) return

    if (descType.value === 'dir') {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory', 'showHiddenFiles', 'createDirectory']
      })

      if (canceled || filePaths.length === 0) return

      const [path] = filePaths
      item.value.desc = path
    } else {
      const opt = ['showHiddenFiles', 'createDirectory', 'showOverwriteConfirmation']
      const { canceled, filePath } = await dialog.showSaveDialog({
        properties: opt,
        filters: [
          {
            extensions: ['php']
          }
        ]
      })

      if (canceled || !filePath) return

      item.value.desc = filePath
    }
  }
</script>
