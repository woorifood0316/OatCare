export default {
    async scheduled(event, env, ctx) {
        // The daily trigger runs billing; the frequent one only delivers notifications.
        const job = event.cron === '0 0 * * *' ? 'billing' : 'notify';
        ctx.waitUntil(
            fetch(`${env.SITE_URL}/api/internal/cron?job=${job}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
            }).then(async (res) => {
                console.log(job, res.status, (await res.text()).slice(0, 500));
            }),
        );
    },
};
