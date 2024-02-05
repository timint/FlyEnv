export default {
  选择站点目录: '选择站点目录',
  选择文件夹: '选择文件夹',

  错误类型: '错误类型',
  type403: `403一般标识权限不足, 可从以下几方面进行排查
  1. 文件夹归属用户, 是否是当前登录用户或者root, 如果不是, 建议更换文件夹
  2. 文件夹执行权限, 是否755或者777, 软件在添加站点时, 默认会更新文件夹权限为755, 但是如果文件夹在某些系统目录内, 可能会无法更改, 这种建议更换文件夹
  3. 服务启动用户, 比如nginx的启动用户, apache的启动用户, 软件的默认配置都是理论上正确可用的, 如果自行修改配置文件, 可以尝试使用默认配置重试`,
  type404: `404一般标识未找到对应的页面文件, 可从以下几方面进行排查
  1. 站点目录下时候有对应的页面文件, 如果是根目录的话, 是否有index.php或index.html
  2. nginx或者apache的配置文件, 是否修改了默认文档
  3. 有些项目需要配置伪静态, 例如ThinkPHP, Laravel等, apache的伪静态文件, 项目里一般都包含的有, 使用nginx的话, 需要在添加站点时添加`,
  type502: `50X一般标识项目执行时有错误或者执行超时, 但是使用域名访问时, 使用了全局VPN的, 也会报502错误, 建议关闭全局VPN后再试`,

  任务已终止: '任务已终止',
  当前有任务正在执行: '当前有任务正在执行，请等待任务执行完毕',
  尚不能执行此任务: '尚不能执行此任务, 请从当前可执行任务中选择',

  未发现可用版本: '未发现可用版本，请先安装',
  Apache服务启动成功: 'Apache服务启动成功',
  服务启动失败端口占用: `服务启动失败，错误原因：
{err}
识别到错误原因: 端口占用，尝试结束占用端口的进程`,

  成功创建站点: '成功创建站点',
  站点域名: '站点域名',
  站点目录: '站点目录',
  尝试开启服务: '尝试开启服务, 请稍候...',
  服务启动成功: '服务启动成功',
  域名: '域名',
  已在浏览器中打开: '已在浏览器中打开，请查看',
  服务启动失败: `服务启动失败, 原因:
{err}
请尝试手动启动服务`,

  MariaDB服务启动成功: 'MariaDB服务启动成功',
  Memcached服务启动成功: 'Memcached服务启动成功',
  Mysql服务启动成功: 'Mysql服务启动成功',
  Nginx服务启动成功: 'Nginx服务启动成功',
  Php服务启动成功: 'Php{num}服务启动成功',

  尝试启动Apache服务: '尝试启动Apache服务...',

  请输入或选择站点目录: '请输入或选择站点目录',
  站点目录无效: '站点目录无效，任务终止',
  请输入站点域名: '请输入站点域名, 例如：www.test.com',
  域名无效: '域名无效，任务终止',
  创建站点中: '创建站点中...',

  请查看日志: '请查看{flag}日志, 把错误信息发送给我',
  识别到端口占用: '识别到错误原因: 端口占用，尝试结束占用端口的进程',
  未识别到错误原因: '未识别到错误原因, 暂无法处理, 等待后续升级',
  识别到Socket占用: '识别到错误原因: Socket文件占用，尝试结束占用Socket文件的进程',

  尝试启动Nginx服务: '尝试启动Nginx服务...',
  站点错误码是否以下几种: '站点错误码是否以下几种?',
  任务执行失败: `任务执行失败，原因:
 {err}`,

  我是pipi: '你好， 我是pipi，有什么可以帮你的吗？',
  你的要求: '可以直接输入你的要求，比如新建站点',
  brewPhp7Issues: `Homebrew官方库PHP版本只会保留较新的几个，如果需要安装较旧版本，例如 PHP7.4, 需要安装第三方存储桶
程序默认会自动安装，但是因为网络问题，第三方存储桶又没有镜像源，可能会安装失败。此时可以自己手动安装。安装命令:
brew tap shivammathur/php`,
  brewNetIssues: `版本管理如果一直获取不到版本，大概率是网络问题，例如php， 程序默认会先自动安装shivammathur/php这个第三方存储桶，存储桶又没有镜像源，就会卡在这里，无法获取到可用版本
建议是使用VPN, 获取到VPN软件的终端代理命令，在软件的设置->代理设置里配置好，然后开启代理， 然后可以再试下看是否能获取和安装版本`,
  brewSlowIssues: `版本安装非常慢的话，大概率是网络问题。可以尝试切换Homebrew镜像再尝试。更推荐的方法是使用VPN
获取到VPN软件的终端代理命令，在软件的设置->代理设置里配置好，然后开启代理， 然后可以再试下看是否能获取和安装版本`,
  macportsNotInstall: `检测到系统未安装MacPorts, 如想安装, 可以点击此链接
<a href="javascript:void();" onclick="openUrl('https://www.macports.org/install.php')">https://www.macports.org/install.php</a>
按照文档说明进行安装.
安装完成后, 可以在设置中切换MacPorts镜像, 来提高安装软件的速度`,
  macportsHasInstall: `检测到系统已安装MacPorts.
如果无法安装软件, 或者安装速度较慢, 可以尝试在设置中切换MacPorts镜像`,
  brewNotInstall: `检测到系统未安装Homebrew, 如想安装, 可以点击此链接
<a href="javascript:void();" onclick="openUrl('https://www.macphpstudy.com/zh/help-4-2.html')">https://www.macphpstudy.com/zh/help-4-2.html</a>
按照文档说明进行安装.
中国用户, 安装完成后, 可以在设置中切换Homebrew源, 来提高安装软件的速度. 但还是更建议使用VPN来解决网络问题
`,
  brewHasInstall: `检测到系统已安装Homebrew.
如果在应用内安装或卸载软件出现问题, 可以尝试手动在命令行中执行命令`,
  mysqlPassword: `Mysql数据库的初始账号密码为 root root
程序没有数据库数据管理功能, 如果需要修改密码或者管理数据库数据, 可以使用以下几种方式:
phpMyAdmin <a href="javascript:void();" onclick="openUrl('https://www.phpmyadmin.net/')">https://www.phpmyadmin.net/</a>
Navicat <a href="javascript:void();" onclick="openUrl('https://www.navicat.com.cn/')">https://www.navicat.com.cn/</a>
MySQL Workbench <a href="javascript:void();" onclick="openUrl('https://www.mysql.com/products/workbench/')">https://www.mysql.com/products/workbench/</a>
DataGrip <a href="javascript:void();" onclick="openUrl('https://www.jetbrains.com/zh-cn/datagrip/')">https://www.jetbrains.com/zh-cn/datagrip/</a>
DbGate <a href="javascript:void();" onclick="openUrl('https://dbgate.org/')">https://dbgate.org/</a>
DBeaver <a href="javascript:void();" onclick="openUrl('https://dbeaver.io/')">https://dbeaver.io/</a>
如果有其他觉得不错的工具, 可以联系我添加`
}
