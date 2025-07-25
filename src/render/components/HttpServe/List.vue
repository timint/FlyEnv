<template>
  <ul ref="fileDroper" class="http-serve-list">
    <template v-if="httpServe.length === 0">
      <li class="empty" @click.stop="choosePath">
        <div class="wapper" :class="{ ondrop: ondrop }">
          <yb-icon :svg="import('../../svg/upload.svg?raw')" class="icon" />
          <span>{{ $t('base.httpServerHint') }}</span>
        </div>
      </li>
    </template>
    <template v-else>
      <el-scrollbar>
        <li v-for="(item, _key) in service" :key="_key" class="http-serve-item">
          <div class="left">
            <div class="top">
              <span class="name"> {{ $t('base.path') }}:</span>
              <span class="value" @click.stop="openDir(_key as any)">{{ _key }} </span>
            </div>
            <div class="bottom">
              <span class="name">{{ $t('base.links') }}:</span>
              <template v-if="!item.host">
                <span class="url empty">{{ $t('base.none') }}</span>
              </template>
              <template v-else>
                <template v-for="(url, _index) in item.host" :key="_index">
                  <QrcodePopper :url="url">
                    <span class="url" @click="doJump(url)">{{ url }} </span>
                  </QrcodePopper>
                </template>
              </template>
            </div>
          </div>
          <div class="right">
            <div v-if="item.run" class="status running">
              <yb-icon
                :svg="import('@/svg/stop2.svg?raw')"
                @click.stop="doStop(_key as any, item)"
              />
            </div>
            <div v-else class="status">
              <yb-icon :svg="import('@/svg/play.svg?raw')" @click.stop="doRun(_key as any, item)" />
            </div>
            <div class="delete">
              <yb-icon :svg="import('@/svg/delete.svg?raw')" @click.stop="doDel(_key as any)" />
            </div>
          </div>
        </li>
      </el-scrollbar>
    </template>
  </ul>
</template>

<script lang="ts">
  import { defineComponent, reactive } from 'vue'
  import IPC from '@/util/IPC'
  import { AppStore } from '@/store/app'
  import { MessageError } from '@/util/Element'
  import QrcodePopper from '@/components/Host/Qrcode/Index.vue'
  import { dialog, shell, fs } from '@/util/NodeFn'

  export default defineComponent({
    components: { QrcodePopper },
    props: {},
    data() {
      return {
        ondrop: false
      }
    },
    computed: {
      service() {
        return AppStore().httpServeService
      },
      httpServe() {
        return AppStore().httpServe
      }
    },
    watch: {
      httpServe: {
        handler(arr: Array<string>) {
          for (const a of arr) {
            if (!this.service[a]) {
              this.service[a] = reactive({
                run: false,
                port: 0,
                host: []
              })
            }
          }
          console.log('this.service: ', this.service)
          const keys = Object.keys(this.service)
          for (const k of keys) {
            if (!arr.includes(k)) {
              const item = this.service[k]
              this.doStop(k, item)
              delete this.service[k]
            }
          }
        },
        immediate: true,
        deep: true
      }
    },
    created: function () {},
    mounted() {
      this.initDroper()
    },
    unmounted() {},
    methods: {
      choosePath() {
        const opt = ['openDirectory']
        dialog
          .showOpenDialog({
            properties: opt
          })
          .then(({ canceled, filePaths }: any) => {
            if (canceled || filePaths.length === 0) {
              return
            }
            const path = filePaths[0]
            this.addPath(path)
          })
      },
      initDroper() {
        const selecter: HTMLElement = this.$refs.fileDroper as HTMLElement
        selecter.addEventListener('drop', async (e: DragEvent) => {
          e.preventDefault()
          e.stopPropagation()
          // Get the collection of dragged files
          const files = Array.from(e.dataTransfer?.files ?? [])
          const dirs: File[] = []
          if (e.dataTransfer?.items?.length) {
            const items = Array.from(e.dataTransfer!.items)
            items.forEach((item: DataTransferItem, index) => {
              const entry = item.webkitGetAsEntry()
              if (entry?.isDirectory) {
                dirs.push(files[index])
              }
            })
          }

          const paths = dirs.map((f) => window.FlyEnvNodeAPI.showFilePath(f))
          console.log('paths: ', paths)

          if (paths.length === 0) {
            this.ondrop = false
            return
          }

          for (const path of paths) {
            this.addPath(path)
          }
          this.ondrop = false
        })
        selecter.addEventListener('dragover', (e) => {
          e.preventDefault()
          e.stopPropagation()
        })

        selecter.addEventListener(
          'dragenter',
          (e) => {
            this.dropNode = e.target
            this.ondrop = true
          },
          false
        )
        selecter.addEventListener(
          'dragleave',
          (e) => {
            if (e.target === this.dropNode) {
              this.ondrop = false
            }
          },
          false
        )
      },
      async addPath(path: string) {
        const exists = await fs.existsSync(path)
        if (!exists) return
        const stat = await fs.stat(path)
        if (!stat.isDirectory) {
          MessageError(this.$t('base.needSelectDir'))
          return
        }
        if (this.httpServe.includes(path)) {
          return
        }
        this.httpServe.unshift(path)
        AppStore().saveConfig()
        this.$nextTick().then(() => {
          let item = this.service[path]
          if (!item) {
            item = reactive({
              run: false,
              port: 0,
              host: []
            })
            this.service[path] = item
          }
          console.log(item)
          this.doRun(path, item)
        })
      },
      doRun(path: string, item: any) {
        IPC.send('app-http-serve-run', path).then((key: string, info: any) => {
          IPC.off(key)
          console.log(info)
          if (info?.path && info.path === path) {
            item.run = true
            item.host = info.host
            item.port = info.port
          }
        })
      },
      doStop(path: string, item: any) {
        IPC.send('app-http-serve-stop', path).then((key: string, info: any) => {
          IPC.off(key)
          if (info?.path && info.path === path) {
            item.run = false
            item.host = ''
            item.port = 0
          }
        })
      },
      doDel(path: string) {
        this.$baseConfirm(this.$t('base.areYouSure'), undefined, {
          customClass: 'confirm-del',
          type: 'warning'
        })
          .then(() => {
            const store = AppStore()
            IPC.send('app-http-serve-stop', path).then((key: string) => {
              IPC.off(key)
            })
            const index = this.httpServe.indexOf(path)
            if (index >= 0) {
              store.httpServe.splice(this.httpServe.indexOf(path), 1)
              store.saveConfig()
            }
          })
          .catch(() => {})
      },
      doJump(host: string) {
        shell.openExternal(host)
      },
      openDir(dir: string) {
        shell.openPath(dir)
      }
    }
  })
</script>
