<template>
  <el-drawer
    ref="host-edit-drawer"
    v-model="show"
    size="500px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    class="host-edit-drawer"
    :with-header="false"
    @closed="closedFn"
  >
    <div class="host-edit">
      <div class="nav pl-3 pr-5">
        <div class="left" @click="show = false">
          <yb-icon :svg="import('@/svg/delete.svg?raw')" class="top-back-icon" />
          <span class="ml-3">{{ isEdit ? I18nT('base.edit') : I18nT('base.add') }}</span>
        </div>
        <el-button :loading="running" :disabled="running" class="shrink0" @click="doSave">{{
          I18nT('base.save')
        }}</el-button>
      </div>

      <el-scrollbar class="flex-1">
        <div class="main-wapper p-3">
          <div class="p-5 pt-2 flex items-center justify-center">
            <el-radio-group v-model="item.subType" :disabled="isEdit">
              <el-radio-button value="springboot" label="SpringBoot">
                <div class="min-w-20">SpringBoot</div>
              </el-radio-button>
              <el-radio-button value="other" label="Other">
                <div class="min-w-20">Tomcat</div>
              </el-radio-button>
            </el-radio-group>
          </div>
          <templatev v-if="item.subType === 'springboot'">
            <div class="main p-5">
              <input
                v-model.trim="item.projectName"
                type="text"
                :class="'input mb-3' + (errs['projectName'] ? ' error' : '')"
                :placeholder="I18nT('host.projectName')"
              />
              <input
                v-model.trim="item.mark"
                style="margin: 15px 0 10px"
                class="input"
                :placeholder="I18nT('host.placeholderComment')"
              />
            </div>
            <div class="plant-title">{{ I18nT('host.jarPackagePath') }}</div>
            <div class="main p-5">
              <div class="path-choose pb-4">
                <input
                  v-model.trim="item.jarDir"
                  type="text"
                  :class="'input' + (errs['jarDir'] ? ' error' : '')"
                  :placeholder="I18nT('host.jarPackagePath')"
                />
                <div class="icon-block" @click="chooseRoot('jarDir')">
                  <yb-icon
                    :svg="import('@/svg/folder.svg?raw')"
                    class="choose"
                    width="18"
                    height="18"
                  />
                </div>
              </div>
            </div>

            <div class="plant-title">{{ I18nT('host.jdkPath') }}</div>
            <div class="main p-5">
              <el-select v-model="item.jdkDir" class="w-full">
                <template v-for="(item, _index) in jdks" :key="_index">
                  <el-option
                    :label="`java${item.version}-${item.bin}`"
                    :value="item.bin"
                  ></el-option>
                </template>
              </el-select>
            </div>

            <div class="plant-title">{{ I18nT('host.tcpPort') }}</div>
            <div class="main p-5">
              <div class="port-set mb-5">
                <input
                  v-model.number="item.projectPort"
                  type="number"
                  :class="'input' + (errs['projectPort'] ? ' error' : '')"
                  :placeholder="I18nT('host.tcpPort')"
                />
              </div>
            </div>

            <div class="plant-title">{{ I18nT('host.startCommand') }}</div>
            <div class="main p-5">
              <textarea
                v-model.trim="item.startCommand"
                type="text"
                class="input-textarea"
                :class="{ error: !!errs['startCommand'] }"
                style="margin-top: 0"
                :placeholder="I18nT('host.startCommand')"
              ></textarea>
            </div>

            <div class="main mt-5 p-5">
              <div class="ssl-switch">
                <span>{{ I18nT('host.envVar') }}</span>
                <el-radio-group v-model="item.envVarType">
                  <el-radio-button value="none" :label="I18nT('base.none')"> </el-radio-button>
                  <el-radio-button value="specify" :label="I18nT('host.specifyVar')">
                  </el-radio-button>
                  <el-radio-button value="file" :label="I18nT('host.fileVar')"> </el-radio-button>
                </el-radio-group>
              </div>

              <div v-if="item.envVarType === 'specify'" style="margin-top: 12px">
                <textarea
                  v-model.trim="item.envVar"
                  type="text"
                  class="input-textarea w-full"
                  style="margin-top: 12px"
                  :placeholder="I18nT('host.envVarHint')"
                ></textarea>
              </div>
              <div v-else-if="item.envVarType === 'file'" class="path-choose pb-4">
                <input
                  v-model.trim="item.envFile"
                  type="text"
                  class="mt-4 input"
                  :placeholder="I18nT('host.fileVarHint')"
                />
                <div class="icon-block" @click="chooseRoot('envFile')">
                  <yb-icon
                    :svg="import('@/svg/folder.svg?raw')"
                    class="choose"
                    width="18"
                    height="18"
                  />
                </div>
              </div>
            </div>
          </templatev>
          <template v-else>
            <div class="main p-5">
              <input
                v-model.trim="item.name"
                type="text"
                :class="'input mb-3' + (errs['name'] ? ' error' : '')"
                :placeholder="I18nT('host.placeholderHostname')"
              />
              <input
                v-model.trim="item.mark"
                style="margin: 15px 0 10px"
                class="input"
                :placeholder="I18nT('host.placeholderComment')"
              />
              <div class="path-choose my-5">
                <input
                  v-model="item.root"
                  type="text"
                  :class="'input' + (errs['root'] ? ' error' : '')"
                  :placeholder="I18nT('host.placeholderRootPath')"
                />
                <div class="icon-block" @click="chooseRoot('root')">
                  <yb-icon
                    :svg="import('@/svg/folder.svg?raw')"
                    class="choose"
                    width="18"
                    height="18"
                  />
                </div>
              </div>
            </div>

            <div class="plant-title">{{ I18nT('host.customJDKAndTomcat') }}</div>
            <div class="main p-5">
              <div class="port-set port-ssl mb-5">
                <div class="port-type"> Tomcat </div>
                <el-select v-model="item.tomcatDir" class="w-full">
                  <template v-for="(item, _index) in tomcats" :key="_index">
                    <el-option
                      :label="`tomcat${item.version}-${item.bin}`"
                      :value="item.bin"
                    ></el-option>
                  </template>
                </el-select>
              </div>
              <div class="port-set port-ssl">
                <div class="port-type"> JDK </div>
                <el-select v-model="item.jdkDir" class="w-full">
                  <template v-for="(item, _index) in jdks" :key="_index">
                    <el-option
                      :label="`java${item.version}-${item.bin}`"
                      :value="item.bin"
                    ></el-option>
                  </template>
                </el-select>
              </div>
            </div>

            <div class="plant-title">{{ I18nT('host.port') }}</div>
            <div class="main p-5">
              <div class="port-set mb-4">
                <div class="port-type"> Tomcat </div>
                <input
                  v-model.number="item.port.tomcat"
                  type="number"
                  :class="'input' + (errs['port_tomcat'] ? ' error' : '')"
                  placeholder="Default: 80"
                />
              </div>
            </div>

            <div class="plant-title">{{ I18nT('host.useSSL') }}</div>
            <div class="main p-5">
              <div class="ssl-switch">
                <span>{{ I18nT('host.useSSL') }}</span>
                <el-switch v-model="item.useSSL"></el-switch>
              </div>

              <div v-if="item.useSSL" class="ssl-switch" style="margin-top: 12px">
                <span>{{ I18nT('host.autoSSL') }}</span>
                <el-switch v-model="item.autoSSL"></el-switch>
              </div>

              <template v-if="item.useSSL && !item.autoSSL">
                <div class="path-choose mt-5">
                  <input
                    v-model="item.ssl.cert"
                    type="text"
                    :class="'input' + (errs['cert'] ? ' error' : '')"
                    placeholder="cert"
                  />
                  <div class="icon-block" @click="chooseRoot('cert')">
                    <yb-icon
                      :svg="import('@/svg/folder.svg?raw')"
                      class="choose"
                      width="18"
                      height="18"
                    />
                  </div>
                </div>

                <div class="path-choose my-5">
                  <input
                    v-model="item.ssl.key"
                    type="text"
                    :class="'input' + (errs['certkey'] ? ' error' : '')"
                    placeholder="cert key"
                  />
                  <div class="icon-block" @click="chooseRoot('certkey')">
                    <yb-icon
                      :svg="import('@/svg/folder.svg?raw')"
                      class="choose"
                      width="18"
                      height="18"
                    />
                  </div>
                </div>
              </template>

              <template v-if="item.useSSL">
                <div class="ssl-switch my-5">
                  <span>{{ I18nT('host.port') }}</span>
                </div>
                <div class="port-set port-ssl mb-5">
                  <div class="port-type"> Tomcat </div>
                  <input
                    v-model.number="item.port.tomcat_ssl"
                    type="number"
                    :class="'input' + (errs['port_tomcat_ssl'] ? ' error' : '')"
                    placeholder="Default: 443"
                  />
                </div>
              </template>
            </div>
          </template>
          <div class="mt-7"></div>
        </div>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
  import { computed, onUnmounted, ref, watch } from 'vue'
  import { handleHost } from '@/util/Host'
  import { AppHost, AppStore } from '@/store/app'
  import { BrewStore } from '@/store/brew'
  import { I18nT } from '@lang/index'
  import { AsyncComponentSetup } from '@/util/AsyncComponent'
  import { merge } from 'lodash-es'
  import { dialog } from '@/util/NodeFn'

  const { show, onClosed, onSubmit, closedFn } = AsyncComponentSetup()

  const props = defineProps<{
    isEdit: boolean
    edit: any
  }>()
  const running = ref(false)
  const park = ref(false)
  const item = ref({
    id: new Date().getTime(),
    type: 'java',
    subType: 'springboot',
    envVarType: 'none',
    projectName: '',
    root: '',
    name: '',
    alias: '',
    mark: '',
    useSSL: false,
    autoSSL: false,
    ssl: {
      cert: '',
      key: ''
    },
    port: {
      tomcat: 80,
      tomcat_ssl: 443
    },
    jarDir: '',
    jdkDir: '',
    tomcatDir: '',
    projectPort: 8085,
    startCommand: '',
    envVar: '',
    envFile: ''
  })
  const errs = ref({
    projectName: false,
    name: false,
    jarDir: false,
    jdkDir: false,
    projectPort: false,
    startCommand: false,
    cert: false,
    certkey: false,
    port_tomcat: false,
    port_tomcat_ssl: false,
    root: false,
    tomcatDir: false
  })
  merge(item.value, props.edit)

  const appStore = AppStore()
  const brewStore = BrewStore()
  const hosts = computed(() => {
    return appStore.hosts.filter((h) => h?.type === 'java')
  })

  const jdks = computed(() => {
    return brewStore.module('java').installed ?? []
  })

  const tomcats = computed(() => {
    return brewStore.module('tomcat').installed ?? []
  })

  watch(
    item,
    () => {
      let k: keyof typeof errs.value
      for (k in errs.value) {
        errs.value[k] = false
      }
    },
    {
      immediate: true,
      deep: true
    }
  )

  const itemName = computed(() => {
    return item.value.name
  })

  watch(itemName, (name) => {
    if (!name) {
      return
    }
    for (const h of hosts.value) {
      if (h.name === name && h.id !== item.value.id) {
        errs.value['name'] = true
        break
      }
    }
  })

  watch(
    () => item.value.projectName,
    (name) => {
      if (!name) {
        return
      }
      for (const h of hosts.value) {
        if (h?.projectName === name && h.id !== item.value.id) {
          errs.value['projectName'] = true
          break
        }
      }
    }
  )

  watch(
    () => `${item.value.jarDir}-${item.value.jdkDir}`,
    () => {
      item.value.startCommand = `${item.value.jdkDir} -jar -Xmx1024M -Xms256M  ${item.value.jarDir}`
    }
  )

  const chooseRoot = (flag: 'jarDir' | 'envFile' | 'cert' | 'certkey' | 'root') => {
    const options: any = {}
    let opt = ['openFile', 'showHiddenFiles']
    if (flag === 'root') {
      opt = ['openDirectory', 'createDirectory', 'showHiddenFiles']
    }
    options.properties = opt
    if (flag === 'jarDir') {
      if (item?.value?.jarDir) {
        options.defaultPath = item.value.jarDir
      }
      options.filters = [
        {
          extensions: ['jar']
        }
      ]
    } else if (flag === 'envFile' && item?.value?.envFile) {
      options.defaultPath = item.value.envFile
    }
    dialog.showOpenDialog(options).then(({ canceled, filePaths }: any) => {
      if (canceled || filePaths.length === 0) {
        return
      }
      const [path] = filePaths
      switch (flag) {
        case 'jarDir':
          item.value.jarDir = path
          break
        case 'envFile':
          item.value.envFile = path
          break
        case 'root':
          item.value.root = path
          break
      }
    })
  }

  const checkItem = () => {
    if (item.value.subType === 'springboot') {
      errs.value['jarDir'] = item.value.jarDir.length === 0
      errs.value['startCommand'] = item.value.startCommand.length === 0
      if (!Number.isInteger(item.value.projectPort)) {
        errs.value['projectPort'] = true
      }
      errs.value['projectName'] = item.value.projectName.length === 0
      if (item.value.projectName) {
        for (const h of hosts.value) {
          if (h?.projectName === item.value.projectName && h.id !== item.value.id) {
            errs.value['projectName'] = true
            break
          }
        }
      }
      errs.value['jdkDir'] = item.value.jdkDir.length === 0
    } else if (item.value.subType === 'other') {
      errs.value['root'] = item.value.root.length === 0
      errs.value['name'] = item.value.name.length === 0

      let u: URL | undefined
      try {
        u = new URL(
          item.value.name.includes('http') ? item.value.name : `https://${item.value.name}`
        )
      } catch {}
      if (!u) {
        errs.value['name'] = true
      } else {
        const name = u.hostname
        for (const h of hosts.value) {
          if (h.name === name && h.id !== item.value.id) {
            errs.value['name'] = true
            break
          }
        }
      }

      errs.value['jdkDir'] = item.value.jdkDir.length === 0
      errs.value['tomcatDir'] = item.value.tomcatDir.length === 0

      if (!Number.isInteger(item.value.port.tomcat)) {
        errs.value['port_tomcat'] = true
      }
      if (item.value.useSSL) {
        if (!Number.isInteger(item.value.port.tomcat_ssl)) {
          errs.value['port_tomcat_ssl'] = true
        }
      }
      if (item.value.useSSL && !item.value.autoSSL) {
        errs.value['cert'] = item.value.ssl.cert.length === 0
        errs.value['certkey'] = item.value.ssl.key.length === 0
      }
    }

    let k: keyof typeof errs.value
    for (k in errs.value) {
      if (errs.value[k]) {
        return false
      }
    }
    return true
  }

  const doSave = () => {
    if (!checkItem()) {
      return
    }
    const saveFn = () => {
      running.value = true
      const flag: 'edit' | 'add' = props.isEdit ? 'edit' : 'add'
      const data = JSON.parse(JSON.stringify(item.value))
      if (data.subType === 'other') {
        data.name = new URL(
          data.name.includes('http') ? data.name : `https://${data.name}`
        ).hostname
      }
      handleHost(data, flag, props.edit as AppHost, park.value).then(() => {
        running.value = false
        show.value = false
      })
    }
    saveFn()
  }

  if (jdks.value.length === 0) {
    const module = brewStore.module('java')
    module.installedFetched = false
    module.fetchInstalled().then(() => {
      if (!item.value.jdkDir && jdks.value.length > 0) {
        const jdk = jdks.value[0]
        item.value.jdkDir = jdk.bin
      }
    })
  } else if (!item.value.jdkDir) {
    const jdk = jdks.value[0]
    item.value.jdkDir = jdk.bin
  }

  if (tomcats.value.length === 0) {
    const module = brewStore.module('tomcat')
    module.installedFetched = false
    module.fetchInstalled().then(() => {
      if (!item.value.tomcatDir && tomcats.value.length > 0) {
        const tomcat = tomcats.value[0]
        item.value.tomcatDir = tomcat.bin
      }
    })
  } else if (!item.value.tomcatDir) {
    const tomcat = tomcats.value[0]
    item.value.tomcatDir = tomcat.bin
  }

  appStore.floatBtnShow = false

  onUnmounted(() => {
    appStore.floatBtnShow = true
  })

  defineExpose({
    show,
    onSubmit,
    onClosed
  })
</script>
