<template>
  <el-drawer
    v-model="show"
    size="75%"
    :destroy-on-close="true"
    :with-header="false"
    @closed="closedFn"
  >
    <div class="host-vhost">
      <div class="nav">
        <div class="left" @click="show = false">
          <yb-icon :svg="import('@/svg/delete.svg?raw')" class="top-back-icon" />
          <span class="ml-15">{{ title }}</span>
        </div>
      </div>

      <Conf
        ref="conf"
        type-flag="xxx"
        :default-file="defaultFile"
        :file="file"
        file-ext="vhost"
        :show-commond="false"
      >
      </Conf>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { I18nT } from '@lang/index'
  import { AsyncComponentSetup } from '@/util/AsyncComponent'
  import Conf from '@/components/Conf/drawer.vue'

  const { join, dirname } = require('path')
  import { existsSync, copyFileSync, mkdirSync } from 'fs'

  const props = defineProps<{
    flag: 'apache' | 'apacheSSL' | 'nginx' | 'nginxSSL' | 'caddy' | 'caddySSL'
  }>()

  const { show, onClosed, onSubmit, closedFn } = AsyncComponentSetup()

  const conf = ref()

  const title = computed(() => {
    const dict = {
      apache: I18nT('host.vhostApacheEdit'),
      apacheSSL: I18nT('host.vhostApacheSSLEdit'),
      nginx: I18nT('host.vhostNginxEdit'),
      nginxSSL: I18nT('host.vhostNginxSSLEdit'),
      caddy: I18nT('host.vhostCaddyEdit'),
      caddySSL: I18nT('host.vhostCaddySSLEdit')
    }
    return dict?.[props.flag] ?? ''
  })

  const file = computed(() => {
    return join(global.Server.BaseDir!, `VhostTemplate/${props.flag}.vhost`)
  })

  const files = {
    apache: join(global.Server.Static!, 'tmpl/apache.vhost'),
    apacheSSL: join(global.Server.Static!, 'tmpl/apacheSSL.vhost'),
    nginx: join(global.Server.Static!, 'tmpl/nginx.vhost'),
    nginxSSL: join(global.Server.Static!, 'tmpl/nginxSSL.vhost'),
    caddy: join(global.Server.Static!, 'tmpl/CaddyfileVhost'),
    caddySSL: join(global.Server.Static!, 'tmpl/CaddyfileVhostSSL')
  }
  const defaultFile = ref(files[props.flag])

  if (!existsSync(file.value)) {
    mkdirSync(dirname(file.value), { recursive: true })
    copyFileSync(defaultFile.value, file.value)
    conf?.value?.update()
  }

  defineExpose({
    show,
    onSubmit,
    onClosed
  })
</script>
