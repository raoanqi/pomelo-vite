const Koa = require('koa')
const fs = require('fs')
const path = require('path')
const compilerSfc = require('@vue/compiler-sfc')
const compilerDom = require('@vue/compiler-dom')

// 创建服务器实例
const app = new Koa()

// 中间件配置
// 处理路由
app.use(async ctx => {
        const {url, query} = ctx.request
        if (url === '/') {
            // 如果路径是/，说明访问的是首页读取index.html文件
            ctx.type = 'text/html'
            ctx.body = fs.readFileSync('./index.html', 'utf-8')
        } else if (url.endsWith('.js')) {
            // 如果访问的是以.js结尾的文件，就读取对应的文件，注意这下面和cjs中的区别
            const absolutePath = path.join(__dirname, url)
            ctx.type = 'application/javascript'
            ctx.body = reWriteImport(fs.readFileSync(absolutePath, 'utf-8'))
        } else if (url.startsWith('/@modules/')) {
            // 先将模块地址替换为空，获得裸模块名称
            const moduleName = url.replace('/@modules/', '')
            // 根据模块名称，去node_modules中查找对应的模块
            const prefix = path.join(__dirname, '../node_modules', moduleName)
            // 从package.json中获取模块的入口文件
            const module = require(`${prefix}/package.json`).module
            // 拼接出入口文件的绝对路径
            const modulePath = path.join(prefix, module)
            const res = fs.readFileSync(modulePath, 'utf-8')
            ctx.type = "application/javascript"
            ctx.body = reWriteImport(res)
        } else if (url.indexOf('.vue') > -1) {
            // 读取vue文件，解析为js
            const vuePath = path.join(__dirname, url.split('?')[0])
            const vueAst = compilerSfc.parse(fs.readFileSync(vuePath, 'utf-8'))
            console.log(vueAst)
            if (!query.type) {
                // 获取脚本的内容
                const scriptContent = vueAst.descriptor.script.content
                // 替换默认导出为一个常量，便于后续修改
                console.log(scriptContent)
                const script = scriptContent.replace('export default ', 'const __script = ')
                // console.log('进入')
                // console.log(script)
                // console.log('出来')
                ctx.type = 'application/javascript'
                ctx.body = `
                ${reWriteImport(script)}
                import {render as __render} from "${url}?type=template"
                __script.render = __render
                export default __script
                `
            } else if (query.type === 'template') {
                // 获取模板内容
                const template = vueAst.descriptor.template.content
                // 编译为渲染函数
                const render = compilerDom.compile(template, {mode: 'module'}).code
                ctx.type = 'application/javascript'
                ctx.body = reWriteImport(render)
            }
        }
    }
)

// 裸模块地址重写
const reWriteImport = content => {
    return content.replace(/ from ['"](.*)['"]/g, (s1, s2) => {
        // 注意这个使用函数作为参数的形式，其中s1就是匹配到的字符串，s2就是匹配到的分组
        // 如果是以/,./,../开头的，说明是相对地址，相对地址import可以识别，所以不需要重写
        if (s2.startsWith('/') || s2.startsWith('./') || s2.startsWith('../')) {
            return s1
        } else {
            // 否则，说明是裸模块，路径需要重写为相对路径
            return ` from '/@modules/${s2}'`
        }
    })
}

app.listen(3006, () => {
    console.log('服务器启动成功')
})


