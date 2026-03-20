const { makeAddItem } = require('../../src/routes/addItem');

test('it stores item correctly', async () => {
    const expectedItem = { id: 'some-uuid', name: 'A sample item', completed: false, userId: '', projectId: '' };
    const mockService = {
        createTodo: jest.fn().mockResolvedValue(expectedItem),
    };
    const addItem = makeAddItem(mockService);

    const req = { body: { name: 'A sample item' } };
    const res = { send: jest.fn() };

    await addItem(req, res);

    expect(mockService.createTodo).toHaveBeenCalledTimes(1);
    expect(mockService.createTodo).toHaveBeenCalledWith('A sample item', '', '');
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(expectedItem);
});

test('it passes userId and projectId from request', async () => {
    const expectedItem = { id: 'some-uuid', name: 'Task', completed: false, userId: 'user-1', projectId: 'proj-1' };
    const mockService = {
        createTodo: jest.fn().mockResolvedValue(expectedItem),
    };
    const addItem = makeAddItem(mockService);

    const req = { userId: 'user-1', body: { name: 'Task', projectId: 'proj-1' } };
    const res = { send: jest.fn() };

    await addItem(req, res);

    expect(mockService.createTodo).toHaveBeenCalledWith('Task', 'user-1', 'proj-1');
});
