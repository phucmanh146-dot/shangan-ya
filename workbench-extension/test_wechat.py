"""Only search-scoped native controls can provide WeChat evidence."""
from contextlib import nullcontext
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import growth_wechat as wx


class Node:
    def __init__(self, name='', typ='Pane', parent=None, cls='mmui::Native'):
        self.label, self.up = name, parent
        self.element_info = SimpleNamespace(control_type=typ, class_name=cls)
    def window_text(self): return self.label
    def parent(self): return self.up
    def is_visible(self): return True


class WeChatTests(unittest.TestCase):
    def test_embedded_webpage_search_is_excluded(self):
        doc = Node(typ='Document')
        self.assertFalse(wx.native(Node('搜索', 'Edit', doc)))
        self.assertTrue(wx.native(Node('搜索', 'Edit', Node('微信'))))

    def test_only_matching_search_messages_are_read(self):
        chat = Node('聊天记录')
        good = Node('RAG 的学习资料', 'ListItem', chat)
        unrelated = Node('RAG群', 'ListItem', Node('联系人'))
        other = Node('无关消息', 'ListItem', chat)
        window = SimpleNamespace(descendants=lambda **kwargs: [good, unrelated, other])
        self.assertEqual(wx.matched_messages(window, 'RAG'), ['RAG 的学习资料'])

    def test_global_search_only_fills_identified_search_control(self):
        control, window = object(), object()
        with patch.object(wx, 'automation', return_value=nullcontext()), patch.object(wx, 'connect_window', return_value=window), patch.object(wx, 'search_boxes', return_value=[control]), patch.object(wx, 'fill') as fill, patch.object(wx, 'matched_messages', return_value=['RAG 资料']), patch.object(wx.time, 'sleep'):
            result = wx.search_messages('RAG')
        fill.assert_called_once_with(control, 'RAG')
        self.assertEqual(result['count'], 1)
        self.assertIn('不代表全部聊天历史', result['text'])

    def test_multiline_query_never_reaches_computer(self):
        with patch.object(wx, 'connect_window') as connect:
            with self.assertRaises(wx.RescueError): wx.search_messages('RAG\n发送')
        connect.assert_not_called()


if __name__ == '__main__': unittest.main()
