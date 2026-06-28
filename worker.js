export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const workerHost = url.host;
        const workerPrefix = url.protocol + '//' + workerHost + '/';

        let targetUrlStr = url.pathname.replace(/^\/+/, "");

        if (!targetUrlStr) {
            return new Response("代理服务运行正常", {
                headers: { "Content-Type": "text/html;charset=UTF-8" }
            });
        }

        if (!targetUrlStr.startsWith('http')) {
            targetUrlStr = 'https://' + targetUrlStr;
        }
        targetUrlStr += url.search;

        try {
            const newHeaders = new Headers(request.headers);
            newHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

            const response = await fetch(targetUrlStr, {
                method: request.method,
                headers: newHeaders,
                redirect: "follow"
            });

            const contentType = response.headers.get("Content-Type") || "";

            if (
                contentType.includes("application/json") ||
                contentType.includes("text/xml") ||
                contentType.includes("application/xml") ||
                contentType.includes("text/plain")
            ) {
                let content = await response.text();

                const escapedHost = workerHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp('https?://(?!' + escapedHost + ')[^\\s"\']+', 'g');

                content = content.replace(regex, function(match) {
                    return workerPrefix + match;
                });

                return new Response(content, {
                    status: response.status,
                    headers: {
                        "Content-Type": contentType,
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "no-cache"
                    }
                });
            }

            const modifiedHeaders = new Headers(response.headers);
            modifiedHeaders.set("Access-Control-Allow-Origin", "*");

            return new Response(response.body, {
                status: response.status,
                headers: modifiedHeaders
            });

        } catch (e) {
            return new Response("代理请求失败: " + e.message, { status: 500 });
        }
    }
};
