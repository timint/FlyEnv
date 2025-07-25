<template>
  <div class="host-edit tools">
    <div class="nav p-0">
      <div class="left">
        <span class="text-xl">{{ $t('util.toolUTF8BomClean') }}</span>
        <slot name="like"></slot>
      </div>
      <template v-if="data.end">
        <el-button type="primary" class="shrink0" @click="doEnd">{{
          $t('base.confirm')
        }}</el-button>
      </template>
      <template v-else>
        <el-button
          type="primary"
          class="shrink0"
          :disabled="files.length === 0 || data.running"
          :loading="data.running"
          @click="doClean"
          >{{ $t('base.cleanup') }}</el-button
        >
      </template>
    </div>

    <div v-loading="data.loading" class="main-wapper overflow-hidden">
      <el-scrollbar>
        <div class="main flex flex-col gap-7 pt-7">
          <el-input v-model="data.path" placeholder="Directory or file">
            <template #append>
              <el-button :icon="FolderOpened" @click.stop="chooseDir"></el-button>
            </template>
          </el-input>

          <el-input
            v-model.trim="data.exclude"
            :disabled="data.running ? 'disabled' : null"
            :readonly="data.running ? 'readonly' : null"
            type="textarea"
            :rows="6"
            resize="none"
            placeholder="Excludes (Example: node_modules), separated by line."
          ></el-input>

          <el-card shadow="never" header="File Type ">
            <div>
              <el-checkbox-group v-model="data.allowExt" :disabled="data.running">
                <template v-for="(item, _i) in data.allExt" :key="_i">
                  <el-checkbox :label="item.ext">{{ item.ext }}({{ item.count }})</el-checkbox>
                </template>
              </el-checkbox-group>
            </div>
          </el-card>

          <template v-if="!data.running">
            <el-progress :text-inside="true" :stroke-width="20" :percentage="0">
              <span>0 / {{ files.length }}</span>
            </el-progress>
          </template>
          <template v-else>
            <el-progress :text-inside="true" :stroke-width="20" :percentage="currentProgress">
              <span>{{ data.progress.finish }} / {{ data.progress.count }}</span>
            </el-progress>
          </template>
          <template v-if="data.end">
            <el-card shadow="never" header="Result">
              <div class="flex flex-col gap-6">
                <div>
                  <span>total file: </span><span>{{ data.progress.count }}</span>
                </div>
                <div>
                  <span>checked file: </span><span>{{ data.progress.finish }}</span>
                </div>
                <div style="color: #67c23a">
                  <template v-if="data.progress.successTask.length > 0">
                    <el-popover placement="left" popper-class="bom-clean-popper">
                      <template #reference>
                        <span>clean success: {{ data.progress.success }}</span>
                      </template>
                      <template #default>
                        <ul>
                          <template v-for="(item, _i) in data.progress.successTask" :key="_i">
                            <li>{{ item.path }}</li>
                          </template>
                        </ul>
                      </template>
                    </el-popover>
                  </template>
                  <template v-else>
                    <span>clean success: {{ data.progress.success }}</span>
                  </template>
                </div>
                <div style="color: #f56c6c">
                  <template v-if="data.progress.failTask.length > 0">
                    <el-popover placement="left" popper-class="bom-clean-popper">
                      <template #reference>
                        <span>clean fail: {{ data.progress.fail }}</span>
                      </template>
                      <template #default>
                        <ul>
                          <template v-for="(item, _i) in data.progress.failTask" :key="_i">
                            <li>{{ item.path }}: {{ item.msg }}</li>
                          </template>
                        </ul>
                      </template>
                    </el-popover>
                  </template>
                  <template v-else>
                    <span>clean fail: {{ data.progress.fail }}</span>
                  </template>
                </div>
              </div>
            </el-card>
          </template>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, reactive, watch } from 'vue'
  import store, { Ext } from './store'
  import IPC from '@/util/IPC'
  import { MessageError } from '@/util/Element'
  import { I18nT } from '@lang/index'
  import { extname } from '@/util/path-browserify'
  import { dialog } from '@/util/NodeFn'
  import { FolderOpened } from '@element-plus/icons-vue'

  const data = computed(() => {
    return store.value
  })
  const allExt = computed(() => {
    const exclude = store.value.exclude.split('\n').filter((e) => e.trim().length > 0)
    const allFile = store.value.files.filter((f) => {
      return exclude.length === 0 || exclude.every((e) => !f.includes(e))
    })
    const exts: { [key: string]: number } = {}
    allFile.forEach((f) => {
      const name = extname(f)
      if (name) {
        if (!exts[name]) {
          exts[name] = 1
        } else {
          exts[name] += 1
        }
      }
    })
    const arr: Array<Ext> = []
    for (const ext in exts) {
      arr.push({
        ext,
        count: exts[ext]
      })
    }
    return arr
  })
  const files = computed(() => {
    const exclude = store.value.exclude.split('\n').filter((e) => e.trim().length > 0)
    const allowExt = store.value.allowExt
    return store.value.files.filter((f) => {
      return (
        (exclude.length === 0 || exclude.every((e) => !f.includes(e))) &&
        allowExt.includes(extname(f))
      )
    })
  })
  const currentProgress = computed(() => {
    const progress = store.value.progress
    return Math.floor((progress.finish / progress.count) * 100.0)
  })
  const chooseDir = () => {
    if (store.value.running && !store.value.end) {
      return
    }
    doEnd()
    dialog
      .showOpenDialog({
        properties: ['openDirectory', 'openFile']
      })
      .then(({ canceled, filePaths }: any) => {
        if (canceled || filePaths.length === 0) {
          return
        }
        const [path] = filePaths
        store.value.path = path
        getAllFile()
      })
  }
  const getAllFile = () => {
    store.value.loading = true
    IPC.send('app-fork:tools', 'getAllFile', store.value.path).then((key: string, res: any) => {
      IPC.off(key)
      if (res?.code === 0) {
        const files: Array<string> = res?.data ?? []
        store.value.files = reactive(files)
      } else {
        MessageError(res?.msg ?? I18nT('util.toolFileTooMore'))
      }
      store.value.loading = false
    })
  }
  const doClean = () => {
    store.value.running = true
    IPC.send('app-fork:tools', 'cleanBom', JSON.parse(JSON.stringify(files.value))).then(
      (key: string, res: any) => {
        if (res?.code === 200) {
          const progress = res?.msg ?? {}
          Object.assign(store.value.progress, reactive(progress))
        } else {
          IPC.off(key)
          store.value.end = true
        }
      }
    )
  }
  const doEnd = () => {
    store.value.path = ''
    store.value.files.splice(0)
    store.value.allExt.splice(0)
    store.value.allowExt.splice(0)
    store.value.exclude = `.idea
.git
.svn
.vscode
node_modules`
    store.value.progress = reactive({
      count: 0,
      finish: 0,
      fail: 0,
      failTask: [],
      success: 0,
      successTask: []
    })
    store.value.running = false
    store.value.end = false
  }
  watch(allExt, (v) => {
    store.value.allExt = v
    store.value.allowExt = reactive(
      v.map((e) => {
        return e.ext
      })
    )
  })
</script>
