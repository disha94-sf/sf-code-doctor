/**
 * Example class with deliberate mistakes, used by the tests and by
 * `npm run scan:example`. Do not copy this code.
 */
public with sharing class AccountService {
    public static void assignOwners(List<Contact> contacts) {
        for (Contact c : contacts) {
            // Mistake: a query inside a loop
            Account acc = [SELECT Id, OwnerId FROM Account WHERE Id = :c.AccountId];
            // Mistake: a hard-coded user ID
            acc.OwnerId = '005Dn000001xYz9';
            // Mistake: DML inside a loop
            update acc;
        }
    }

    public static void assignOwnersCorrectly(List<Contact> contacts, Id ownerId) {
        Set<Id> accountIds = new Set<Id>();
        for (Contact c : contacts) {
            accountIds.add(c.AccountId);
        }
        List<Account> accounts = [SELECT Id FROM Account WHERE Id IN :accountIds];
        for (Account acc : accounts) {
            acc.OwnerId = ownerId;
        }
        update accounts;
    }
}
