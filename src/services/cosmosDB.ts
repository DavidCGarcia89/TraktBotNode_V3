import { Client, Collection, StoreMode } from 'documentdb-typescript'; // https://www.npmjs.com/package/documentdb-typescript
import { config } from '../config';
import { IAddress } from 'botbuilder';

export async function storeAddress(address: IAddress) {
    const collection = await openOrCreateCollection();
    await collection.storeDocumentAsync({
        id: `${address.channelId} ${address.user.id}`,
        address: address
    }, StoreMode.Upsert);
    collection.database.client.close();
}

export async function findAddress(id: string) : Promise<IAddress> {
    if (id) {
        const collection = await openOrCreateCollection();
        const document = await collection.findDocumentAsync(id) as any;
        collection.database.client.close();
        return document.address;
    }
}

async function openOrCreateCollection() : Promise<Collection> {
    const client = new Client(config.get('COSMOSDB_host'), config.get('COSMOSDB_key'));
    const collection = new Collection("botusers", "botdocs", client);
    await collection.openOrCreateAsync();
    return collection;
}