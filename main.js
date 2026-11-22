const PER_PAGE = 40;

class MainController extends Controller {

    load(data) {
        this.id = data.id;
        this.url = data.url;
        this.page = 0;

        var cached = this.readCache();
        if (cached && (!cached.items || cached.items.length === 0)) {
            cached = null;
        }
        let list;
        if (cached) {
            list = cached.items;
        } else {
            list = [];
        }

        this.data = {
            list: list,
            loading: false,
            hasMore: true
        };

        if (cached) {
            let now = new Date().getTime();
            if (now - cached.time > 30 * 60 * 1000) {
                this.reload();
            }
        } else {
            this.reload();
        }

    }

    async onPressed(index) {
        await this.navigateTo('book', {
            data: this.data.list[index]
        });
    }

    onRefresh() {
        this.reload();
    }

    async onLoadMore() {
        this.setState(() => {
            this.data.loading = true;
        });
        try {

            let page = this.page + 1;
            let url = this.makeURL(page);
            let text = await this.fetchPage(url);
            this.page = page;
            let items = this.parseData(text, url);
    
            this.setState(()=>{
                for (let item of items) {
                    this.data.list.push(item);
                }
                this.data.loading = false;
                this.data.hasMore = items.length >= PER_PAGE;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(()=>{
                this.data.loading = false;
            });
        }
        
    }

    makeURL(page) {
        return this.url.replace('{0}', page + 1);
    }

    async fetchPage(url) {
        let res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });
        return await res.text();
    }

    async reload() {
        this.setState(() => {
            this.data.loading = true;
        });
        try {
            let url = this.makeURL(0);
            let text = await this.fetchPage(url);
            let items = this.parseData(text, url);
            if (items.length === 0) {
                throw new Error('No manga items found on the page');
            }
            console.log(JSON.stringify(items));
            this.page = 0;
            localStorage['cache_' + this.id] = JSON.stringify({
                time: new Date().getTime(),
                items: items,
            });
            this.setState(()=>{
                this.data.list = items;
                this.data.loading = false;
                this.data.hasMore = items.length >= PER_PAGE;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(()=>{
                this.data.loading = false;
            });
        }
    }

    readCache() {
        let cache = localStorage['cache_' + this.id];
        if (cache) {
            let json = JSON.parse(cache);
            return json;
        }
    }

    parseData(text, url) {
        const doc = HTMLParser.parse(text);
        let elems = doc.querySelectorAll('#contList .bcover');
        if (elems.length === 0) {
            elems = doc.querySelectorAll('.book-result .cf .book-cover .bcover');
        }

        let results = [];

        for (let i = 0, t = elems.length; i < t; ++i) {
            let elem = elems[i];

            let link = elem.getAttribute('href');
            let img = elem.querySelector('img');
            if (!link || !img) continue;

            let picture = img.getAttribute('src') || img.getAttribute('data-src');
            if (!picture) continue;

            let subtitle = elem.querySelector('.tt');
            results.push({
                title: elem.getAttribute('title'),
                link: new URL(link, url).toString(),
                picture: new URL(picture, url).toString(),
                subtitle: subtitle ? subtitle.text.trim() : '',
            });
        }
        return results;
    }

}

module.exports = MainController;